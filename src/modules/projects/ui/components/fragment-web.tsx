import { useState } from "react";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";

interface Props{
    data:Fragment;
}

export function FragmentWeb({data}:Props){
    const [copied,setCopied]=useState(false);
    const [fragmentKey, setFragmentKey]=useState(0);
    const onRefresh=()=>{
        setFragmentKey((prev)=>prev+1)
    };
    const handleCopy=()=>{
        navigator.clipboard.writeText(data.sandboxUrl);
        setCopied(true)
        setTimeout(()=>setCopied(false), 2000)
    }
    return(
        <div className="flex flex-col w-full h-full ">
            <div className="p-2 border-b flex items-center gap-x-2 bg-sidebar">
                <Hint text="Refresh" align="start" side="bottom">
                    <Button variant="outline" size="sm" onClick={onRefresh}>
                        <RefreshCcwIcon/>
                    </Button>
                </Hint>    
                <Hint text="Copy link" align="center" side="bottom">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={!data.sandboxUrl || copied} className="flex-1 justify-start font-normal text-start">
                    <span className="truncate">{data.sandboxUrl}</span>
                    </Button>
                </Hint>
                <Hint text="Open in a new tab" side="bottom" align="start">
                    <Button size="sm" disabled={!data.sandboxUrl} variant="outline" onClick={()=>{if(!data.sandboxUrl) return; window.open(data.sandboxUrl, "_blank");}}>
                        <ExternalLinkIcon/>
                    </Button>
                </Hint>
            </div>
            <iframe 
            key={fragmentKey}
            className="h-full w-full"
            sandbox="allow-forms allow-scripts allow-same-origin"
            loading="lazy"
            src={data.sandboxUrl}
            />
        </div>
    )
}