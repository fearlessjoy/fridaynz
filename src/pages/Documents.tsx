import { Layout } from "@/components/Layout";
import DocumentsManager from "@/components/DocumentsManager";
import { ModeToggle } from "@/components/ModeToggle";

const Documents = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        <div className="grid gap-8 grid-cols-1">
          <DocumentsManager />
        </div>
      </div>
    </Layout>
  );
};

export default Documents; 