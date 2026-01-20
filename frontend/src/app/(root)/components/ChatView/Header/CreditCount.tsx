import { Authenticated } from "convex/react";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface CreditCountProps {
  usage:
    | 
      {
        _id: Id<"usage">;
        _creationTime: number;
        messagesRemaining: number;
        userId: Id<"users">;
      } 
    | null 
    | undefined
}

export default function CreditCount({ usage }: CreditCountProps) {
  return (
    <Authenticated>
      {usage ? (
        <div className="flex flex-row border-2 rounded-2xl p-2 text-[12px]">
          Credit Remaining: {usage.messagesRemaining}
        </div>
      ) : (
        <div className="flex flex-row border-2 rounded-2xl p-2 text-[12px]">
          Credit Remaining: ...
        </div>
      )}
    </Authenticated>
  );
}
