import {
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Calendar,
  User,
  Trash2,
  Edit,
  Image as ImageIcon,
  PlayCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useDeleteResource, useUpdateResource } from '@/hooks/use-resources';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TypeIcon = ({ type, className }) => {
  switch (type?.toLowerCase()) {
    case 'video':
      return <Video className={className} />;
    case 'image':
      return <ImageIcon className={className} />;
    case 'document':
    case 'pdf':
      return <FileText className={className} />;
    case 'link':
      return <LinkIcon className={className} />;
    default:
      return <FileText className={className} />;
  }
};

export const ResourceCard = ({ resource, isOwner }) => {
  const isLink = resource.type?.toLowerCase() === 'link';
  const { mutate: deleteResource, isPending: isDeleting } = useDeleteResource();
  const { mutate: updateResource, isPending: isUpdating } = useUpdateResource();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: resource.title || '',
    description: resource.description || '',
    category: resource.category || '',
  });

  const resourceUrl = resource.cloudinary_url || resource.cloudinaryUrl || resource.url || '';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const apiOrigin = new URL(apiBase).origin;

  const resolveResourceUrl = (url) => {
    if (!url || typeof url !== 'string') return '';

    // Handles values like "res.cloudinary.com/..." by adding https.
    if (url.startsWith('res.cloudinary.com/')) return `https://${url}`;

    // Supports protocol-relative URLs such as "//res.cloudinary.com/...".
    if (url.startsWith('//')) return `https:${url}`;

    // Absolute URL already.
    if (/^https?:\/\//i.test(url)) return url;

    // Relative backend/static path fallback.
    return new URL(url, apiOrigin).toString();
  };

  const isAuthProtectedUrl = (url) => {
    try {
      return new URL(url).origin === apiOrigin;
    } catch {
      return false;
    }
  };

  const getDownloadUrl = (url) => {
    // For Cloudinary assets, fl_attachment hints browser to download instead of preview.
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };

  const fetchBlobWithCredentials = async (url) => {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Unable to access file (${response.status})`);
    }

    return response.blob();
  };

  const openBlobInNewTab = (blob) => {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  };

  const triggerBlobDownload = (blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = resource.title || 'resource-file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  };

  const handleView = async () => {
    if (!resourceUrl) {
      toast({
        title: 'File unavailable',
        description: 'This resource does not have a valid file URL yet.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const resolvedUrl = resolveResourceUrl(resourceUrl);

      if (isAuthProtectedUrl(resolvedUrl)) {
        const blob = await fetchBlobWithCredentials(resolvedUrl);
        openBlobInNewTab(blob);
        return;
      }

      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: 'Unable to open file',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async () => {
    if (!resourceUrl) {
      toast({
        title: 'Download failed',
        description: 'No valid file URL found for this resource.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const resolvedUrl = resolveResourceUrl(resourceUrl);

      if (isAuthProtectedUrl(resolvedUrl)) {
        const blob = await fetchBlobWithCredentials(resolvedUrl);
        triggerBlobDownload(blob);
        return;
      }

      const downloadUrl = getDownloadUrl(resolvedUrl);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = resource.title || 'resource-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      deleteResource(resource._id);
    }
  };

  const handleUpdate = () => {
    if (!formData.title || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required.',
        variant: 'destructive',
      });
      return;
    }
    const updateData = new FormData();
    updateData.append('title', formData.title);
    updateData.append('description', formData.description);
    if (formData.category) updateData.append('category', formData.category);

    updateResource(
      { id: resource._id, formData: updateData },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  if (isEditing) {
    return (
      <Card className="flex flex-col h-full border-primary shadow-md">
        <CardHeader>
          <CardTitle>Edit Resource</CardTitle>
          <CardDescription>Update your resource details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Resource Title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Resource Description"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Science, Notes"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleUpdate} disabled={isUpdating}>
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const renderOwnerActions = () => {
    if (!isOwner) return null;
    return (
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={() => setIsEditing(true)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const type = resource.type?.toLowerCase() || 'document';

  if (type === 'image') {
    return (
      <Card className="flex flex-col h-full group overflow-hidden border-border/50 hover:border-primary/50 transition-colors relative">
        <div className="relative w-full h-40 bg-muted">
          {resourceUrl ? (
            <img
              src={resolveResourceUrl(resourceUrl)}
              alt={resource.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          {renderOwnerActions()}
          <Badge className="absolute bottom-2 left-2 bg-black/60 hover:bg-black/70 text-white border-0 backdrop-blur-md">
            Image
          </Badge>
        </div>
        <CardContent className="flex-1 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {resource.category && (
              <Badge variant="outline" className="text-xs font-normal py-0">
                {resource.category}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg line-clamp-1 mb-1">{resource.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
        </CardContent>
        <CardFooter className="pt-0 pb-4">
          <div className="w-full grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleView}
            >
              <ExternalLink className="w-4 h-4" /> View
            </Button>
            <Button size="sm" className="flex items-center gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" /> Download
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (type === 'video') {
    return (
      <Card className="flex flex-col h-full group overflow-hidden border-border/50 hover:border-primary/50 transition-colors relative">
        <div className="relative w-full h-40 bg-zinc-950 flex items-center justify-center">
          <PlayCircle className="w-12 h-12 text-zinc-500 group-hover:text-primary transition-colors duration-300" />
          {renderOwnerActions()}
          <Badge className="absolute bottom-2 left-2 bg-black/60 hover:bg-black/70 text-white border-0 backdrop-blur-md">
            Video
          </Badge>
        </div>
        <CardContent className="flex-1 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {resource.category && (
              <Badge variant="outline" className="text-xs font-normal py-0">
                {resource.category}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg line-clamp-1 mb-1">{resource.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
        </CardContent>
        <CardFooter className="pt-0 pb-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleView}
          >
            <PlayCircle className="w-4 h-4" /> Watch
          </Button>
          <Button size="sm" className="flex items-center gap-2" onClick={handleDownload}>
            <Download className="w-4 h-4" /> Download
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (type === 'link') {
    return (
      <Card className="flex flex-col h-full group border-l-4 border-blue-500 hover:border-blue-600 transition-colors relative isolate">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <LinkIcon className="w-24 h-24" />
        </div>
        <CardHeader className="flex-1 pb-2 relative z-0">
          {renderOwnerActions()}
          <div className="flex items-center gap-2 mb-2 pt-2">
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 pointer-events-none"
            >
              External Link
            </Badge>
            {resource.category && (
              <Badge variant="outline" className="text-xs font-normal py-0">
                {resource.category}
              </Badge>
            )}
          </div>
          <CardTitle className="line-clamp-2 text-xl mb-1">{resource.title}</CardTitle>
          <CardDescription className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
            {resource.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4 relative z-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <User className="w-3.5 h-3.5" />
            <span>{isOwner ? 'You' : resource.tutor_id?.name || 'Unknown Tutor'}</span>
            <span className="mx-1">•</span>
            <span>
              {resource.createdAt ? format(new Date(resource.createdAt), 'MMM d') : 'Unknown Date'}
            </span>
          </div>
          <Button
            variant="default"
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleView}
          >
            <ExternalLink className="w-4 h-4" />
            Visit Resource
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full group border-border hover:shadow-md transition-all relative">
      <CardHeader className="pb-2">
        <div className="flex justify-between w-full items-start relative z-0">
          <div className="flex items-center justify-center p-3 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          {renderOwnerActions()}
        </div>
        <div className="flex items-center gap-2 mb-1 pt-1">
          <Badge variant="outline" className="text-xs font-normal py-0 capitalize">
            {resource.type || 'Document'}
          </Badge>
          {resource.category && (
            <Badge variant="secondary" className="text-xs font-normal py-0">
              {resource.category}
            </Badge>
          )}
        </div>
        <CardTitle className="line-clamp-2 text-lg">{resource.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <CardDescription className="line-clamp-3 text-sm">{resource.description}</CardDescription>
      </CardContent>
      <CardFooter className="border-t border-border/50 bg-muted/20 px-6 py-4 rounded-b-xl">
        <div className="w-full flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-2"
            onClick={handleView}
          >
            <ExternalLink className="w-4 h-4" /> View
          </Button>
          <Button size="sm" className="flex-1 flex items-center gap-2" onClick={handleDownload}>
            <Download className="w-4 h-4" /> Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
