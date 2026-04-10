import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FilePlus2 } from 'lucide-react';
import { useCreateResource } from '@/hooks/use-resources';

export const UploadResourceModal = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'document',
    file: null,
  });

  const { mutate: createResource, isPending } = useCreateResource();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, file: e.target.files[0] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('type', formData.type);
    if (formData.file) {
      data.append('file', formData.file);
    }

    createResource(data, {
      onSuccess: () => {
        setOpen(false);
        setFormData({ title: '', description: '', type: 'document', file: null });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="w-4 h-4" />
          Share Resource
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share a Resource</DialogTitle>
          <DialogDescription>Upload notes, links, or videos for students to use.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g. React Pattern Guide"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              placeholder="Brief description of the resource"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Resource Type</Label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="document">Document (PDF/Notes)</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="file">Resource File</Label>
            <div className="flex items-center gap-3">
              <Input
                id="file"
                name="file"
                type="file"
                onChange={handleFileChange}
                required
                className="cursor-pointer file:cursor-pointer file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:font-medium"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.file}>
              {isPending ? 'Uploading...' : 'Save Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
