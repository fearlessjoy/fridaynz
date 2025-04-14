import Dashboard from "@/components/Dashboard";
import { ModeToggle } from "@/components/ModeToggle";
import { Layout } from "@/components/Layout";
import { useAppData } from "@/hooks/useAppData";

const Index = () => {
  // Use the app data context to access real-time data
  const { teamMembers, tasks, addTeamMember, addTask, updateTask } = useAppData();
  
  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        <div className="grid gap-8 grid-cols-1">
          <Dashboard />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
