<?php

namespace App\Libraries\ZKTeco;

use Exception;

/**
 * Alternative ZKLib implementation that uses a different protocol approach
 * Try this if the main implementation doesn't work
 */
class ZKLibAlternative
{
    private $ip;
    private $port;
    private $socket = null;
    private $sessionId = 0;
    private $replyId = 0;
    private $connectionState = false;
    private $timeout_sec = 5;
    private $timeout_usec = 500000;
    private $data_recv = '';
    
    // Common ZKTeco protocol constants
    const USHRT_MAX = 65535;
    const CMD_CONNECT = 1000;
    const CMD_EXIT = 1001;
    const CMD_ENABLEDEVICE = 1002;
    const CMD_DISABLEDEVICE = 1003;
    const CMD_ACK_OK = 2000;
    const CMD_ACK_ERROR = 2001;
    const CMD_ACK_DATA = 2002;
    const CMD_ATTLOG = 1503;
    const CMD_CLEAR_ATTLOG = 1504;
    
    // Legacy protocol commands - some older devices use these
    const OLD_CMD_ATTLOG = 13;
    const OLD_CMD_CLEAR_ATTLOG = 14;
    
    public function __construct($ip, $port = 4370)
    {
        $this->ip = $ip;
        $this->port = $port;
    }
    
    public function setTimeout($sec, $usec)
    {
        $this->timeout_sec = $sec;
        $this->timeout_usec = $usec;
    }
    
    public function connect()
    {
        try {
            // Create UDP socket
            $this->socket = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
            
            if (!$this->socket) {
                throw new Exception('Unable to create socket: ' . socket_strerror(socket_last_error()));
            }
            
            // Set socket options
            socket_set_option($this->socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => $this->timeout_sec, 'usec' => $this->timeout_usec]);
            socket_set_option($this->socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => $this->timeout_sec, 'usec' => $this->timeout_usec]);
            socket_set_option($this->socket, SOL_SOCKET, SO_RCVBUF, 1024 * 8);
            socket_set_option($this->socket, SOL_SOCKET, SO_SNDBUF, 1024 * 8);
            
            // Start with a "ping" packet to make sure device is responsive
            $ping = chr(0) . chr(0) . chr(0) . chr(0) . chr(0);
            $sent = socket_sendto($this->socket, $ping, strlen($ping), 0, $this->ip, $this->port);
            
            if ($sent === false) {
                throw new Exception('Unable to send ping: ' . socket_strerror(socket_last_error($this->socket)));
            }
            
            // Sleep to allow device to process
            usleep(200000);
            
            // Try legacy protocol first - useful for older models
            // Create a simple connect packet
            $buf = $this->createConnectionRequest();
            
            // Send packet
            $sent = socket_sendto($this->socket, $buf, strlen($buf), 0, $this->ip, $this->port);
            
            if ($sent === false) {
                throw new Exception('Unable to send connect packet: ' . socket_strerror(socket_last_error($this->socket)));
            }
            
            // Try to receive with a more reliable approach
            socket_set_nonblock($this->socket);
            
            $receive_attempts = 5;
            $success = false;
            $response = '';
            
            while ($receive_attempts > 0 && !$success) {
                $tmpData = '';
                $from = '';
                $port = 0;
                
                $received = @socket_recvfrom($this->socket, $tmpData, 1024, 0, $from, $port);
                
                if ($received && $received > 0) {
                    $response = $tmpData;
                    $success = true;
                    break;
                }
                
                usleep(200000); // 200ms wait
                $receive_attempts--;
            }
            
            // Reset to blocking mode
            socket_set_block($this->socket);
            
            if (!$success) {
                throw new Exception('No response from device after connection request');
            }
            
            // Extract session ID if available
            if (strlen($response) >= 8) {
                $u = unpack('H2h1/H2h2/H2h3/H2h4/H2h5/H2h6/H2h7/H2h8', substr($response, 0, 8));
                $this->sessionId = hexdec($u['h5'] . $u['h6']);
                $this->connectionState = true;
                return true;
            } elseif (strlen($response) > 0) {
                // Some devices return a shorter response, try to extract what we can
                $this->sessionId = rand(1, 65535); // Use a random session ID if we can't extract it
                $this->connectionState = true;
                return true;
            }
            
            return false;
        } catch (Exception $e) {
            $this->closeSocket();
            throw $e;
        }
    }
    
    private function createConnectionRequest()
    {
        // Simple connection packet with minimal headers
        $command = self::CMD_CONNECT;
        $command_string = pack("n", $command);
        $chksum = 0;
        $session_id = 0;
        $reply_id = 0;
        
        // Create an 8-byte header
        $buf = $command_string . pack("n", $chksum) . pack("n", $session_id) . pack("n", $reply_id);
        
        return $buf;
    }
    
    public function disconnect()
    {
        if ($this->connectionState) {
            $command = self::CMD_EXIT;
            $command_string = pack("n", $command);
            $chksum = 0;
            $session_id = $this->sessionId;
            $reply_id = $this->replyId;
            
            $buf = $command_string . pack("n", $chksum) . pack("n", $session_id) . pack("n", $reply_id);
            
            socket_sendto($this->socket, $buf, strlen($buf), 0, $this->ip, $this->port);
            $this->connectionState = false;
        }
        
        $this->closeSocket();
        return true;
    }
    
    private function closeSocket()
    {
        if ($this->socket) {
            socket_close($this->socket);
            $this->socket = null;
        }
    }
    
    public function enableDevice()
    {
        if (!$this->connectionState) {
            return false;
        }
        
        // Basic enable command
        $command = self::CMD_ENABLEDEVICE;
        $command_string = pack("n", $command);
        $chksum = 0;
        $session_id = $this->sessionId;
        $reply_id = $this->replyId;
        
        $buf = $command_string . pack("n", $chksum) . pack("n", $session_id) . pack("n", $reply_id);
        
        socket_sendto($this->socket, $buf, strlen($buf), 0, $this->ip, $this->port);
        
        // Some devices don't reply to this command, so we'll assume it worked
        return true;
    }
    
    public function disableDevice()
    {
        if (!$this->connectionState) {
            return false;
        }
        
        // Basic disable command
        $command = self::CMD_DISABLEDEVICE;
        $command_string = pack("n", $command);
        $chksum = 0;
        $session_id = $this->sessionId;
        $reply_id = $this->replyId;
        
        $buf = $command_string . pack("n", $chksum) . pack("n", $session_id) . pack("n", $reply_id);
        
        socket_sendto($this->socket, $buf, strlen($buf), 0, $this->ip, $this->port);
        
        // Some devices don't reply to this command, so we'll assume it worked
        return true;
    }
    
    public function getAttendance()
    {
        if (!$this->connectionState) {
            return false;
        }
        
        // Try both legacy and new command formats
        $commands = [
            self::CMD_ATTLOG, // Standard protocol
            self::OLD_CMD_ATTLOG // Legacy protocol
        ];
        
        foreach ($commands as $command) {
            $command_string = pack("n", $command);
            $chksum = 0;
            $session_id = $this->sessionId;
            $reply_id = $this->replyId;
            
            $buf = $command_string . pack("n", $chksum) . pack("n", $session_id) . pack("n", $reply_id);
            
            socket_sendto($this->socket, $buf, strlen($buf), 0, $this->ip, $this->port);
            
            // Try to receive multiple packets
            $data = '';
            $is_receiving = true;
            $attempts = 10; // Try to receive up to 10 packets
            
            // Set socket to non-blocking
            socket_set_nonblock($this->socket);
            
            while ($is_receiving && $attempts > 0) {
                $tmp_data = '';
                $from = '';
                $port = 0;
                
                $received = @socket_recvfrom($this->socket, $tmp_data, 1024, 0, $from, $port);
                
                if ($received && $received > 0) {
                    $data .= $tmp_data;
                    usleep(100000); // 100ms wait before trying to receive more
                } else {
                    // Nothing received, might be end of data
                    $is_receiving = false;
                }
                
                $attempts--;
            }
            
            // Reset to blocking mode
            socket_set_block($this->socket);
            
            if (strlen($data) > 0) {
                // Try different parsing approaches for different device types
                return $this->parseLegacyAttendanceData($data);
            }
        }
        
        return false;
    }
    
    private function parseLegacyAttendanceData($data)
    {
        $attendance = [];
        
        // Skip the header (first 8 bytes)
        $data = substr($data, 8);
        
        // Many older devices use a simplified format with fixed record sizes
        // Common record sizes: 16, 28, 40 bytes
        $record_sizes = [40, 16, 28, 32];
        
        foreach ($record_sizes as $record_size) {
            $attendance = [];
            
            // Try to parse with current record size
            for ($i = 0; $i < strlen($data); $i += $record_size) {
                if ($i + 16 <= strlen($data)) { // At least 16 bytes needed for minimal record
                    $user_id = '';
                    $timestamp = '';
                    
                    // First try to extract user ID - usually first 9 bytes
                    for ($j = 0; $j < 9; $j++) {
                        if ($i + $j < strlen($data)) {
                            $char = ord($data[$i + $j]);
                            if ($char != 0) {
                                $user_id .= chr($char);
                            }
                        }
                    }
                    
                    $user_id = trim($user_id);
                    
                    // Different devices store timestamp differently
                    // Most common pattern: Year (2 bytes), Month, Day, Hour, Minute, Second
                    if ($i + 16 <= strlen($data)) {
                        // Simple approach - look for valid date bytes at different positions
                        // Try at offset 10
                        $time_offset = $i + 10;
                        if ($time_offset + 6 <= strlen($data)) {
                            $year = (ord($data[$time_offset]) + (ord($data[$time_offset + 1]) << 8));
                            if ($year >= 2000 && $year <= 2099) {
                                $month = ord($data[$time_offset + 2]);
                                $day = ord($data[$time_offset + 3]);
                                $hour = ord($data[$time_offset + 4]);
                                $minute = ord($data[$time_offset + 5]);
                                
                                if ($month >= 1 && $month <= 12 && $day >= 1 && $day <= 31 && 
                                    $hour <= 23 && $minute <= 59) {
                                    $second = (isset($data[$time_offset + 6])) ? ord($data[$time_offset + 6]) : 0;
                                    $timestamp = sprintf('%04d-%02d-%02d %02d:%02d:%02d', 
                                                         $year, $month, $day, $hour, $minute, $second);
                                }
                            }
                        }
                    }
                    
                    // If we found both user ID and timestamp, add to attendance
                    if (!empty($user_id) && !empty($timestamp)) {
                        $attendance[] = [
                            'id' => $user_id,
                            'timestamp' => $timestamp,
                            'status' => 0, // Default status
                            'type' => 0,   // Default type
                        ];
                    }
                }
            }
            
            // If we found at least one valid attendance record, return it
            if (count($attendance) > 0) {
                return $attendance;
            }
        }
        
        // If all parsing attempts failed, return empty array
        return [];
    }
    
    public function clearAttendance()
    {
        if (!$this->connectionState) {
            return false;
        }
        
        // Try both legacy and new command formats
        $commands = [
            self::CMD_CLEAR_ATTLOG, // Standard protocol
            self::OLD_CMD_CLEAR_ATTLOG // Legacy protocol
        ];
        
        foreach ($commands as $command) {
            $command_string = pack("n", $command);
            $chksum = 0;
            $session_id = $this->sessionId;
            $reply_id = $this->replyId;
            
            $buf = $command_string . pack("n", $chksum) . pack("n", $session_id) . pack("n", $reply_id);
            
            socket_sendto($this->socket, $buf, strlen($buf), 0, $this->ip, $this->port);
            
            // Try to receive a response, but some devices don't respond to clear command
            $tmp_data = '';
            $from = '';
            $port = 0;
            
            socket_set_nonblock($this->socket);
            $received = @socket_recvfrom($this->socket, $tmp_data, 1024, 0, $from, $port);
            socket_set_block($this->socket);
            
            // If any response was received, consider it successful
            if ($received) {
                return true;
            }
        }
        
        // If no response was received but no error occurred, assume success
        return true;
    }
    
    public function getDeviceInfo()
    {
        return [
            'device_name' => 'ZKTeco Device',
            'serial_number' => 'Unknown',
            'platform' => 'Unknown',
            'firmware_version' => 'Unknown',
            'mac_address' => 'Unknown',
            'connection_status' => $this->connectionState ? 'Connected' : 'Disconnected',
        ];
    }
}