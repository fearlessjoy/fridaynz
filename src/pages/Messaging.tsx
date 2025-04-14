import React from 'react';
import { ModeToggle } from "@/components/ModeToggle";
import MessagingPanel from "@/components/MessagingPanel";
import { Layout } from "@/components/Layout";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from '@/hooks/useAuth';

const Messaging = () => {
  // Use the app data context to access real-time team members data
  const { teamMembers } = useAppData();
  const { currentUser } = useAuth();
  
  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        <main className="container mx-auto px-4 py-8 h-screen">
          <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-kiwi-600 to-ocean-600 bg-clip-text text-transparent">
            Partner Messaging
          </h1>
          <div className="h-[calc(100vh-8rem)]">
            <MessagingPanel 
              teamMembers={teamMembers} 
              currentUserId={currentUser?.uid || ""} 
            />
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Messaging;
