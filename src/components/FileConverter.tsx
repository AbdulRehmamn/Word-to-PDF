import React, { useState, useCallback } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader2, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import ConvertApi from 'convertapi-js';

interface ConversionState {
  status: 'idle' | 'uploading' | 'converting' | 'completed' | 'error';
  progress: number;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}

type ConversionType = 'word-to-pdf' | 'pdf-to-word';

const FileConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [conversionType, setConversionType] = useState<ConversionType>('word-to-pdf');
  const [apiToken] = useState('EUxOQALEmEzEqNRVXGDFinuT93H6ULfe');
  const [conversion, setConversion] = useState<ConversionState>({ status: 'idle', progress: 0 });
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    const isValidFile = conversionType === 'word-to-pdf' 
      ? (droppedFile.type.includes('word') || droppedFile.name.endsWith('.doc') || droppedFile.name.endsWith('.docx'))
      : (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf'));

    if (droppedFile && isValidFile) {
      setFile(droppedFile);
      setConversion({ status: 'idle', progress: 0 });
    } else {
      const expectedType = conversionType === 'word-to-pdf' ? 'DOC or DOCX' : 'PDF';
      toast({
        title: "Invalid file type",
        description: `Please upload a ${expectedType} file.`,
        variant: "destructive"
      });
    }
  }, [toast, conversionType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setConversion({ status: 'idle', progress: 0 });
    }
  };

  const openFileDialog = () => {
    document.getElementById('file-upload')?.click();
  };

  const saveApiToken = () => {
    localStorage.setItem('convertapi_token', apiToken);
    toast({
      title: "API Token saved",
      description: "Your ConvertAPI token has been saved locally."
    });
  };

  const convertFile = async () => {
    if (!file || !apiToken) {
      toast({
        title: "Missing requirements",
        description: "Please select a file.",
        variant: "destructive"
      });
      return;
    }

    try {
      setConversion({ status: 'uploading', progress: 20 });
      
      const convertApi = ConvertApi.auth(apiToken);
      const params = convertApi.createParams();
      params.add('File', file);

      setConversion({ status: 'converting', progress: 60 });
      
      // Determine conversion direction based on conversion type
      const fromFormat = conversionType === 'word-to-pdf' ? 'docx' : 'pdf';
      const toFormat = conversionType === 'word-to-pdf' ? 'pdf' : 'docx';
      
      const result = await convertApi.convert(fromFormat, toFormat, params);
      
      const newFileName = conversionType === 'word-to-pdf'
        ? file.name.replace(/\.(doc|docx)$/i, '.pdf')
        : file.name.replace(/\.pdf$/i, '.docx');
      
      setConversion({ 
        status: 'completed', 
        progress: 100, 
        fileName: newFileName,
        downloadUrl: result.files[0].Url 
      });

      toast({
        title: "Conversion successful!",
        description: `${file.name} has been converted to ${toFormat.toUpperCase()}.`
      });

    } catch (error) {
      console.error('Conversion error:', error);
      setConversion({ 
        status: 'error', 
        progress: 0, 
        error: 'Failed to convert file. Please check your API token and try again.' 
      });
      
      toast({
        title: "Conversion failed",
        description: "There was an error converting your file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadFile = () => {
    if (conversion.downloadUrl) {
      const link = document.createElement('a');
      link.href = conversion.downloadUrl;
      link.download = conversion.fileName || 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetConverter = () => {
    setFile(null);
    setConversion({ status: 'idle', progress: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg bg-white shadow-sm border">
            <button
              onClick={() => {
                setConversionType('word-to-pdf');
                setFile(null);
                setConversion({ status: 'idle', progress: 0 });
              }}
              className={`px-6 py-3 text-sm font-medium rounded-l-lg transition-colors ${
                conversionType === 'word-to-pdf'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Word to PDF ⇄
            </button>
            <button
              onClick={() => {
                setConversionType('pdf-to-word');
                setFile(null);
                setConversion({ status: 'idle', progress: 0 });
              }}
              className={`px-6 py-3 text-sm font-medium rounded-r-lg transition-colors ${
                conversionType === 'pdf-to-word'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              PDF to Word ⇄
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Header */}
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {conversionType === 'word-to-pdf' ? 'Select Word Document' : 'Select PDF Document'}
          </h2>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={conversionType === 'word-to-pdf' 
                ? ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : ".pdf,application/pdf"
              }
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />

            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <FileIcon className="h-12 w-12 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{file.name}</h3>
                  <p className="text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={openFileDialog}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Choose Different File
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Upload className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <button
                    onClick={openFileDialog}
                    className="text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Upload a file
                  </button>
                  <span className="text-gray-500"> or drag and drop</span>
                </div>
                <p className="text-sm text-gray-500">
                  {conversionType === 'word-to-pdf' 
                    ? 'Word documents only (.doc or .docx)'
                    : 'PDF files only (.pdf)'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Conversion Status */}
          {conversion.status !== 'idle' && (
            <div className="mt-6 space-y-4">
              {conversion.status === 'error' ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{conversion.error}</AlertDescription>
                </Alert>
              ) : conversion.status === 'completed' ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 font-medium">
                      Conversion completed successfully!
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{conversion.fileName}</h4>
                      <p className="text-gray-500 text-sm">Ready for download</p>
                    </div>
                    <Button onClick={downloadFile} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                      <Download className="h-4 w-4" />
                      Download File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="font-medium">
                      {conversion.status === 'uploading' ? 'Uploading file...' : 'Converting file...'}
                    </span>
                  </div>
                  <Progress value={conversion.progress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Convert Button */}
          {file && conversion.status === 'idle' && (
            <div className="mt-8">
              <button
                onClick={convertFile}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileIcon className="h-5 w-5" />
                {conversionType === 'word-to-pdf' ? 'Convert to PDF' : 'Convert to Word'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileConverter;