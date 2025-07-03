import { Authenticated } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";

interface CreditCountProps {
  useage:
    | {
        _id: Id<"useage">;
        _creationTime: number;
        user_id: string;
        messagesRemaining: number;
      }
    | null
    | undefined;
}

export default function CreditCount({ useage }: CreditCountProps) {
  return (
    <Authenticated>
      {useage ? (
        <div className="flex flex-row border-2 rounded-2xl p-2 text-[12px]">
          Credit Remaining: {useage.messagesRemaining}
        </div>
      ) : (
        <div className="flex flex-row border-2 rounded-2xl p-2 text-[12px]">
          Credit Remaining: ...
        </div>
      )}
    </Authenticated>
  );
}
