"use client";
import { Button } from "@/components/ui/button";
import {useTRPC} from "@/trpc/client"
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const Home=()=> {
  const trpc=useTRPC();
  const invoke=useMutation(trpc.invoke.mutationOptions({
    onSuccess: ()=>{
      toast.success("Background Job Started...")
    }
  }))
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Button disabled={invoke.isPending}onClick={() => invoke.mutate({text:"arjun"})}>
        Invoke background Job
      </Button>
    </div>
  );
}

export default Home
