import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader, PenLine, BookOpen } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createThreadMutationFn } from "@/lib/thread-api";

// ─── Validation Schema ────────────────────────────────────────────────────────
const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "History",
  "Geography",
  "Literature",
  "Economics",
  "Philosophy",
  "Engineering",
  "Medicine",
  "Law",
  "Business",
  "Other",
];

const createThreadSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  content: z
    .string()
    .min(20, "Content must be at least 20 characters")
    .max(5000, "Content must not exceed 5000 characters"),
  subject: z.string().min(1, "Please select a subject"),
});

// ─── Component ────────────────────────────────────────────────────────────────
const CreateThreadModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createThreadSchema),
    defaultValues: { title: "", content: "", subject: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createThreadMutationFn,
  });

  const onSubmit = (data) => {
    mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        toast({
          title: "Thread created!",
          description: "Your discussion thread has been posted successfully.",
        });
        reset();
        onClose();
      },
      onError: (error) => {
        toast({
          title: "Failed to create thread",
          description:
            error?.message ||
            "Something went wrong. Please check your content and try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleClose = () => {
    if (!isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        id="create-thread-modal"
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PenLine size={20} className="text-primary" />
            Start a Discussion
          </DialogTitle>
          <DialogDescription>
            Ask a question or start a discussion with the community.
            Be clear and specific to get helpful responses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="thread-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="thread-title"
              placeholder="e.g. How do I solve quadratic equations?"
              {...register("title")}
              disabled={isPending}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="thread-subject" className="text-sm font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <BookOpen
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <select
                id="thread-subject"
                {...register("subject")}
                disabled={isPending}
                className={`
                  w-full h-9 pl-9 pr-3 rounded-md border text-sm bg-background
                  focus:outline-none focus:ring-1 focus:ring-ring
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${errors.subject ? "border-destructive" : "border-input"}
                `}
              >
                <option value="">Select a subject…</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {errors.subject && (
              <p className="text-xs text-destructive mt-1">
                {errors.subject.message}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="thread-content" className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="thread-content"
              placeholder="Describe your question or topic in detail. Include any relevant context, what you've already tried, and what you're hoping to learn…"
              rows={7}
              {...register("content")}
              disabled={isPending}
              className={`
                w-full px-3 py-2 rounded-md border text-sm bg-background resize-none
                focus:outline-none focus:ring-1 focus:ring-ring
                disabled:opacity-50 disabled:cursor-not-allowed
                placeholder:text-muted-foreground
                ${errors.content ? "border-destructive" : "border-input"}
              `}
            />
            {errors.content && (
              <p className="text-xs text-destructive mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              id="cancel-thread-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              id="submit-thread-btn"
              className="min-w-[120px]"
            >
              {isPending ? (
                <>
                  <Loader size={15} className="animate-spin" />
                  Posting…
                </>
              ) : (
                "Post Thread"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateThreadModal;
