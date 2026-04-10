import { useState, useRef } from 'react';
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
import { Upload, FilePlus2, CloudUpload, Link as LinkIcon, FileCheck } from 'lucide-react';
import { useCreateResource } from '@/hooks/use-resources';

export const UploadResourceModal = () => {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    type: 'document',
    linkUrl: '',
    file: null,
  });

  const { mutate: createResource, isPending } = useCreateResource();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData((prev) => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFormData((prev) => ({ ...prev, file: e.dataTransfer.files[0] }));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('type', formData.type);
    if (formData.category) data.append('category', formData.category);

    if (formData.type === 'link') {
      data.append('linkUrl', formData.linkUrl);
    } else if (formData.file) {
      data.append('file', formData.file);
    }

    createResource(data, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          title: '',
          description: '',
          category: '',
          type: 'document',
          linkUrl: '',
          file: null,
        });
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

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Share a Resource</DialogTitle>
          <DialogDescription>Upload notes, links, or videos for students to use.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5 py-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Resource Type</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border-2 border-input bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="document" className="bg-background">
                  Document/Notes
                </option>
                <option value="image" className="bg-background">
                  Image
                </option>
                <option value="video" className="bg-background">
                  Video
                </option>
                <option value="link" className="bg-background">
                  External Link
                </option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g. Frontend"
              />
            </div>
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

          {formData.type === 'link' ? (
            <div className="grid gap-2">
              <Label htmlFor="linkUrl">Resource URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="linkUrl"
                  name="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={handleInputChange}
                  required
                  placeholder="https://example.com"
                  className="pl-9"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="file">Resource File</Label>
              <div
                onClick={triggerFileInput}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer group
                  ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-background hover:bg-accent/50'}
                `}
              >
                <input
                  id="file"
                  name="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  required={!formData.file}
                />

                {formData.file ? (
                  <div className="flex flex-col items-center space-y-2 text-primary">
                    <FileCheck className="w-10 h-10" />
                    <span className="text-sm font-medium text-center truncate max-w-[200px]">
                      {formData.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Click or drag to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <CloudUpload className="w-10 h-10 mb-1" />
                    <span className="text-sm font-medium">Click to select or drag and drop</span>
                    <span className="text-xs text-center opacity-70">
                      Supports PDF, images, videos, and documents
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || (formData.type === 'link' ? !formData.linkUrl : !formData.file)
              }
            >
              {isPending ? 'Saving...' : 'Save Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
