"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const Home = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const [value, setValue] = useState("");
  
  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (data) => {
        router.push(`/projects/${data.id}`);
      },
    })
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent pb-2">
            CodeGenie
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-light">
            What do you want to create today?
          </p>
        </div>

        <div className="w-full bg-card/50 backdrop-blur-xl border shadow-2xl rounded-2xl p-6 md:p-8 space-y-6">
          <Textarea
            placeholder="Describe your dream application..."
            className="min-h-[150px] text-lg resize-none bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 transition-all"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            size="lg"
            className="w-full text-lg h-14 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
            disabled={createProject.isPending || !value.trim()}
            onClick={() => createProject.mutate({ value })}
          >
            {createProject.isPending ? (
              "Creating Magic..."
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating
              </>
            )}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground opacity-50">
          Powered by Advanced AI Agentic Coding
        </p>
      </div>
    </div>
  );
};

export default Home;
