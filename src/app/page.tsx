"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {useTRPC} from "@/trpc/client"
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const Home=()=> {
  const trpc=useTRPC();
  const [value, setValue]= useState("")
  const {data:messages} =useQuery(trpc.message.getMany.queryOptions())
  const createMessage=useMutation(trpc.message.create.mutationOptions({
    onSuccess: ()=>{
      toast.success("Background Job Started...")
    }
  }))
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Input value={value} onChange={(e)=>setValue(e.target.value)}/>
      <Button disabled={createMessage.isPending} onClick={() => createMessage.mutate({value:value})}>
        Invoke background Job
      </Button>
      {JSON.stringify(messages, null, 2)}
    </div>
  );
}

export default Home
