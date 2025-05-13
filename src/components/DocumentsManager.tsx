import React, { useState, useEffect } from "react";
import { uploadFile, getFiles, deleteFile } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { FileIcon, Trash2, Download, FileText, FilePlus2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";

interface DocumentFile {
  name: string;
  type: string;
  size: number;
  url: string;
  path: string;
  uploadedBy: string;
  uploadedAt: Date | string;
  description?: string;
  category?: string;
}

const DocumentsManager = () => {
  const { toast } = useToast();
  const { currentUser, userData } = useAuth();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [fileCategory, setFileCategory] = useState("general");
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Categories for documents
  const categories = [
    { id: "general", name: "General" },
    { id: "contracts", name: "Contracts" },
    { id: "invoices", name: "Invoices" },
    { id: "reports", name: "Reports" },
    { id: "other", name: "Other" }
  ];

  // Load files when component mounts
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const documentFiles = await getFiles("documents");
      setFiles(documentFiles);
    } catch (err: any) {
      console.error("Error loading files:", err);
      setError(err.message || "Failed to load documents");
      toast({
        variant: "destructive",
        title: "Error loading documents",
        description: err.message || "Failed to load documents",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a file to upload",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Upload with metadata and track progress
      await uploadFile(
        selectedFile, 
        "documents", 
        {
          description: fileDescription,
          category: fileCategory,
        },
        // Progress callback
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // Reset form
      setSelectedFile(null);
      setFileDescription("");
      setFileCategory("general");
      setUploadProgress(null);
      setShowUploadDialog(false);
      
      // Reload files
      await loadFiles();
      
      toast({
        title: "File uploaded",
        description: "Your document was uploaded successfully",
      });
    } catch (err: any) {
      console.error("Error uploading file:", err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message || "Failed to upload document",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file: DocumentFile) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    try {
      await deleteFile(file.path);
      
      // Update local state
      setFiles(files.filter(f => f.path !== file.path));
      
      toast({
        title: "File deleted",
        description: `${file.name} was deleted successfully`,
      });
    } catch (err: any) {
      console.error("Error deleting file:", err);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message || "Failed to delete document",
      });
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get icon based on file type
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('image')) return <FileIcon className="h-8 w-8 text-blue-500" />;
    if (type.includes('word') || type.includes('document')) return <FileIcon className="h-8 w-8 text-blue-700" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileIcon className="h-8 w-8 text-green-600" />;
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  // Group files by category
  const filesByCategory = files.reduce((acc, file) => {
    const category = file.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(file);
    return acc;
  }, {} as Record<string, DocumentFile[]>);

  // Format upload date for display
  const formatUploadDate = (dateValue: Date | string | undefined) => {
    if (!dateValue) return "Unknown date";
    
    try {
      // If it's a Firestore timestamp or string date, convert to Date object
      let date: Date;
      
      if (typeof dateValue === 'string') {
        // Try to parse the string as a date
        date = new Date(dateValue);
      } else {
        // It's already a Date object
        date = dateValue;
      }
      
      // Check if the date is valid before formatting
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <FilePlus2 className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Upload a document to share with your team.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Select File</Label>
                <Input 
                  id="file" 
                  type="file" 
                  onChange={handleFileChange} 
                  disabled={isUploading}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  disabled={isUploading}
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  placeholder="Enter a description for this document" 
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              
              {uploadProgress !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress 
                    value={uploadProgress} 
                    className="h-2 transition-all"
                    style={{
                      background: 'rgba(0,0,0,0.1)',
                    }}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    {uploadProgress < 100 
                      ? `Uploading ${selectedFile?.name}...` 
                      : "Processing document..."}
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading}
                className={isUploading ? "opacity-80" : ""}
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full"></span>
                    {uploadProgress < 100 ? "Uploading..." : "Processing..."}
                  </>
                ) : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {files.length === 0 ? (
            <Card className="text-center p-8">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No documents yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Upload your first document to get started.
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowUploadDialog(true)}
                  >
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Documents</TabsTrigger>
                {categories.map(category => (
                  filesByCategory[category.id] && filesByCategory[category.id].length > 0 && (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.name} ({filesByCategory[category.id]?.length || 0})
                    </TabsTrigger>
                  )
                ))}
              </TabsList>
              
              <TabsContent value="all">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {files.map((file, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(file.type)}
                            <CardTitle className="text-base truncate">
                              {file.name}
                            </CardTitle>
                          </div>
                        </div>
                        <CardDescription className="truncate">
                          {file.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="text-sm text-muted-foreground">
                          <p>Size: {formatFileSize(file.size)}</p>
                          <p>Category: {categories.find(c => c.id === file.category)?.name || "General"}</p>
                          <p>Uploaded: {formatUploadDate(file.uploadedAt)}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-1">
                        <div className="flex justify-between w-full">
                          <Button variant="outline" size="sm" asChild>
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(file)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {categories.map(category => (
                <TabsContent key={category.id} value={category.id}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filesByCategory[category.id]?.map((file, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {getFileIcon(file.type)}
                              <CardTitle className="text-base truncate">
                                {file.name}
                              </CardTitle>
                            </div>
                          </div>
                          <CardDescription className="truncate">
                            {file.description || "No description"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="text-sm text-muted-foreground">
                            <p>Size: {formatFileSize(file.size)}</p>
                            <p>Uploaded: {formatUploadDate(file.uploadedAt)}</p>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-1">
                          <div className="flex justify-between w-full">
                            <Button variant="outline" size="sm" asChild>
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(file)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentsManager; 