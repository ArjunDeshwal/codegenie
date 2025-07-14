"use Client";
import{
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface HintProp{
    children:React.ReactNode,
    text:string,
    side?:"top"|"right"|"bottom"|"left",
    align?:"start"|"center"|"end",
};
export const Hint=({children,text, side="top", align="center"}:HintProp)=>{
    return(
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent side={side} align={align}>
                    <p>{text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}