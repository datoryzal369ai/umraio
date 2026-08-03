import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pending: boolean;
};

export function SubmitButton({ pending, className, children, ...props }: SubmitButtonProps) {
  const label = typeof children === "string" ? children : "";

  return (
    <Button
      type="submit"
      {...props}
      className={cn("w-full", className)}
      disabled={pending}
      aria-label={pending ? `${label} – processing` : undefined}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  );
}
