import React from 'react';
import { FileText, Download, Eye, Image } from 'lucide-react';

const FileDisplay = ({ filePath, fileName = null }) => {
    if (!filePath) return null;
    
    // Extract filename from path if not provided
    const displayName = fileName || filePath.split('/').pop();
    
    // Get file extension
    const fileExtension = displayName.split('.').pop().toLowerCase();
    
    // Determine file type
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
    const isPdf = fileExtension === 'pdf';
    const isDocument = ['doc', 'docx'].includes(fileExtension);
    
    // Full URL to the file
    const fileUrl = `/storage/${filePath}`;
    
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = displayName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleView = () => {
        window.open(fileUrl, '_blank');
    };
    
    return (
        <div className="border rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        {isImage ? (
                            <div className="relative">
                                <img 
                                    src={fileUrl} 
                                    alt={displayName}
                                    className="h-12 w-12 object-cover rounded border"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="h-12 w-12 bg-gray-200 rounded border hidden items-center justify-center">
                                    <Image className="h-6 w-6 text-gray-400" />
                                </div>
                            </div>
                        ) : (
                            <div className="h-12 w-12 bg-blue-100 rounded flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {displayName}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                            {isPdf ? 'PDF Document' : 
                             isDocument ? 'Word Document' : 
                             isImage ? 'Image File' : 
                             `${fileExtension.toUpperCase()} File`}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={handleView}
                        className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                        title="View file"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                        title="Download file"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileDisplay;