import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { checkFirestoreConnection } from "@/lib/firebaseStatus";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FirestoreStatus() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<any>(null);

  const checkConnection = async () => {
    if (!currentUser) {
      setStatus('error');
      setMessage("You must be logged in to check Firestore connection");
      return;
    }

    try {
      setStatus('checking');
      setMessage("Checking Firestore connection...");
      setDetails(null);

      const result = await checkFirestoreConnection();
      
      if (result.connected) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.message);
        setDetails(result.errorDetails);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || "An error occurred while checking Firestore connection");
      setDetails(error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      checkConnection();
    }
  }, [currentUser]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Firestore Status</span>
          {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
          {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
        </CardTitle>
        <CardDescription>
          Checks connection to Firebase Firestore database
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {status === 'idle' && (
          <div className="text-sm text-muted-foreground">
            Click the button below to check Firestore connection
          </div>
        )}
        
        {status === 'checking' && (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">{message}</span>
          </div>
        )}
        
        {status === 'success' && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Connected</AlertTitle>
            <AlertDescription className="text-green-700 text-xs">
              {message}
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="text-xs">
              {message}
              {details && (
                <div className="mt-2 p-2 bg-red-950 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-28">
                  {JSON.stringify(details, null, 2)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={checkConnection} 
          disabled={status === 'checking'}
        >
          {status === 'checking' ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              {status === 'error' ? "Retry Connection Check" : "Check Connection"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 