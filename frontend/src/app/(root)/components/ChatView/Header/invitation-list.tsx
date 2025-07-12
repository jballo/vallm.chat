import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/atoms/button";
import { Check, XIcon } from "lucide-react";

export function InvitationList() {
  const pendingInvitations = useQuery(api.sharing.getPendingInvitations);
  const acceptInvite = useMutation(api.sharing.acceptInvitation);
  const denyInvite = useMutation(api.sharing.denyInvitation);

  return (
    <>
      {pendingInvitations && pendingInvitations.length > 0 ? (
        pendingInvitations.map((invitation) => (
          <div
            key={invitation._id}
            className="flex flex-col gap-2 p-3 border border-[#2a2a2a] rounded-xl mb-2"
          >
            <p className="text-base font-bold">{invitation.chat_name}</p>
            <p className="text-sm">{invitation.author_email} shared a chat.</p>
            <div className="flex flex-row items-center justify-between">
              <p className="text-sm">
                {new Date(invitation._creationTime).toLocaleDateString()}
              </p>
              <div className="flex flex-row gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => denyInvite({ invitation_id: invitation._id })}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
                <Button
                  className="rounded-xl px-3 py-1 text-sm"
                  onClick={() =>
                    acceptInvite({ invitation_id: invitation._id })
                  }
                >
                  <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col gap-2 p-3 border border-[#2a2a2a] rounded-xl mb-2">
          No Invitations
        </div>
      )}
    </>
  );
}
