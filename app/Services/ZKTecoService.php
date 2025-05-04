<?php

namespace App\Services;

use App\Libraries\ZKTeco\ZKLib;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ZKTecoService
{
    private $ip;
    private $port;
    private $zk;
    private $connected = false;
    private $cacheEnabled = true;
    private $cacheTTL = 300; // 5 minutes
    
    public function __construct($ip, $port = 4370)
    {
        $this->ip = $ip;
        $this->port = $port;
        $this->zk = new ZKLib($ip, $port);
    }
    
    public function getZk()
    {
        return $this->zk;
    }
    
    /**
     * Set caching options
     * 
     * @param bool $enabled Enable/disable caching
     * @param int $ttl Cache TTL in seconds
     */
    public function setCacheOptions($enabled = true, $ttl = 300)
    {
        $this->cacheEnabled = $enabled;
        $this->cacheTTL = $ttl;
    }
    
    /**
     * Connect to the biometric device with optimized timeout and retry settings
     */
    public function connect()
    {
        try {
            // Reduced timeout for faster connection attempts
            $this->zk->setTimeout(3, 500000); // 3 second timeout with 500ms buffer
            
            // Connection cache key to avoid repeated connections to the same device
            $cacheKey = "zkteco_connection_{$this->ip}_{$this->port}";
            
            // Check if we have recently connected to this device
            if ($this->cacheEnabled && Cache::has($cacheKey)) {
                $this->connected = true;
                return true;
            }
            
            Log::info("Connecting to ZKTeco device", [
                'ip' => $this->ip,
                'port' => $this->port
            ]);
            
            // Try UDP protocol first (most common)
            $connected = false;
            
            // Create a new instance to ensure clean connection
            $this->zk = new ZKLib($this->ip, $this->port, 'UDP');
            
            try {
                $connected = $this->zk->connect();
            } catch (\Exception $e) {
                // Quick fallback to TCP with no delay
                $this->zk = new ZKLib($this->ip, $this->port, 'TCP');
                try {
                    $connected = $this->zk->connect();
                } catch (\Exception $e2) {
                    // Both protocols failed, log full error only for debugging
                    Log::debug("TCP connection attempt also failed", [
                        'error' => $e2->getMessage()
                    ]);
                    $connected = false;
                }
            }
            
            if ($connected) {
                $this->connected = true;
                
                // Only enable the device once
                try {
                    $this->zk->enableDevice();
                } catch (\Exception $e) {
                    // Some devices don't support this - continue anyway
                    Log::debug("EnableDevice failed, continuing", [
                        'error' => $e->getMessage()
                    ]);
                }
                
                // Cache successful connection
                if ($this->cacheEnabled) {
                    Cache::put($cacheKey, true, $this->cacheTTL);
                }
                
                return true;
            } else {
                Log::warning("Failed to connect to ZKTeco device", [
                    'ip' => $this->ip,
                    'port' => $this->port
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error("ZKTeco Connection Error", [
                'message' => $e->getMessage(),
                'ip' => $this->ip
            ]);
            
            $this->disconnect();
            throw $e;
        }
    }
    
    /**
     * Force a reconnection to the device
     */
    public function reconnect()
    {
        $this->disconnect();
        // Clear connection cache
        $cacheKey = "zkteco_connection_{$this->ip}_{$this->port}";
        Cache::forget($cacheKey);
        
        // Re-create the ZKLib instance to ensure a clean connection
        $this->zk = new ZKLib($this->ip, $this->port);
        return $this->connect();
    }
    
    /**
     * Get attendance data with optimized memory handling
     */
    public function getAttendance()
    {
        try {
            // Check connection and connect if needed
            if (!$this->connected && !$this->connect()) {
                throw new \Exception("Cannot connect to device");
            }
            
            // Cache key for attendance data
            $cacheKey = "zkteco_attendance_{$this->ip}_{$this->port}";
            
            // Check cache first
            if ($this->cacheEnabled && Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }
            
            // Fetch attendance logs with optimized fetch
            $attendance = $this->zk->getAttendance();
            
            if ($attendance === false) {
                // Single quick recovery attempt
                $this->zk->enableDevice();
                $attendance = $this->zk->getAttendance();
                
                if ($attendance === false) {
                    throw new \Exception("Failed to get attendance data from device");
                }
            }
            
            // Cache successful result
            if ($this->cacheEnabled && is_array($attendance) && count($attendance) > 0) {
                Cache::put($cacheKey, $attendance, $this->cacheTTL);
            }
            
            return $attendance;
        } catch (\Exception $e) {
            Log::error("Failed to get attendance", [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Clear attendance records
     */
    public function clearAttendance()
    {
        try {
            if (!$this->connected && !$this->connect()) {
                throw new \Exception("Cannot connect to device");
            }
            
            // Clear attendance with minimal operations
            $result = $this->zk->clearAttendance();
            
            // Remove cache
            if ($this->cacheEnabled) {
                $cacheKey = "zkteco_attendance_{$this->ip}_{$this->port}";
                Cache::forget($cacheKey);
            }
            
            return $result;
        } catch (\Exception $e) {
            Log::error("Error clearing attendance logs", [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Get device information
     */
    public function getDeviceInfo()
    {
        try {
            if (!$this->connected && !$this->connect()) {
                throw new \Exception("Cannot connect to device");
            }
            
            // Cache device info to avoid repeated calls
            $cacheKey = "zkteco_device_info_{$this->ip}_{$this->port}";
            
            if ($this->cacheEnabled && Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }
            
            // Get device details with timeout protection
            $deviceInfo = [
                'device_name' => $this->zk->getDeviceName() ?: 'ZKTeco Device',
                'serial_number' => $this->zk->getSerialNumber() ?: 'N/A',
                'platform' => $this->zk->getPlatform() ?: 'ZKTeco',
                'firmware_version' => $this->zk->getFirmwareVersion() ?: 'N/A',
                'mac_address' => $this->zk->getMac() ?: 'N/A',
                'connection_status' => 'Connected',
                'ip_address' => $this->ip,
                'port' => $this->port
            ];
            
            // Cache device info
            if ($this->cacheEnabled) {
                Cache::put($cacheKey, $deviceInfo, 3600); // Cache for 1 hour
            }
            
            return $deviceInfo;
        } catch (\Exception $e) {
            Log::error("Error getting device info", [
                'error' => $e->getMessage()
            ]);
            
            // Return minimal info if error occurs
            return [
                'device_name' => 'ZKTeco Device',
                'serial_number' => 'Error',
                'platform' => 'ZKTeco',
                'firmware_version' => 'N/A',
                'connection_status' => 'Error: ' . $e->getMessage(),
                'ip_address' => $this->ip,
                'port' => $this->port
            ];
        }
    }
    
    /**
     * Optimized fast socket test without protocol overhead
     */
    public function testSocket()
    {
        // Direct socket connection test without protocol overhead
        $fp = @fsockopen($this->ip, $this->port, $errno, $errstr, 2);
        
        if (!$fp) {
            return [
                'success' => false,
                'message' => "Socket connection failed: $errstr ($errno)"
            ];
        }
        
        fclose($fp);
        return [
            'success' => true,
            'message' => "Socket connection successful to {$this->ip}:{$this->port}"
        ];
    }
    
    /**
     * Test device with optimized ping check
     */
    public function testDeviceAvailability() 
    {
        // Perform a fast ping test before attempting connection
        $pingCommand = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN')
            ? "ping -n 1 -w 500 {$this->ip}" // Windows
            : "ping -c 1 -W 0.5 {$this->ip}"; // Linux/MacOS
        
        exec($pingCommand, $pingOutput, $pingReturnCode);
        
        if ($pingReturnCode !== 0) {
            return [
                'success' => false,
                'message' => "Device is not reachable (ping failed)",
                'details' => implode("\n", $pingOutput)
            ];
        }
        
        // Now try a socket connection
        return $this->testSocket();
    }
    
    /**
     * Disconnect from the device
     */
    public function disconnect()
    {
        try {
            if ($this->connected) {
                $this->zk->disconnect();
                $this->connected = false;
            }
        } catch (\Exception $e) {
            Log::debug("Error during disconnect", [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Make sure to disconnect when object is destroyed
     */
    public function __destruct()
    {
        $this->disconnect();
    }
}