import {
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Calendar,
  User,
  Trash2,
} from 'lucide-react';
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
import { useDeleteResource } from '@/hooks/use-resources';
import { useToast } from '@/hooks/use-toast';

const TypeIcon = ({ type, className }) => {
  switch (type?.toLowerCase()) {
    case 'video':
      return <Video className={className} />;
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
  const { mutate: deleteResource, isPending } = useDeleteResource();
  const { toast } = useToast();

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

  return (
    <Card className="flex flex-col h-full hover:border-primary/50 transition-colors relative">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <TypeIcon type={resource.type} className="w-3 h-3" />
            <span className="capitalize">{resource.type}</span>
          </Badge>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isPending}
              title="Delete Resource"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardTitle className="line-clamp-2" title={resource.title}>
          {resource.title}
        </CardTitle>
        <CardDescription className="line-clamp-3 mt-2 min-h-[4.5rem]">
          {resource.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{isOwner ? 'You' : resource.tutor_id?.name || 'Unknown Tutor'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {resource.createdAt
                ? format(new Date(resource.createdAt), 'MMM d, yyyy')
                : 'Unknown Date'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {isLink ? (
          <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleView}>
            <ExternalLink className="w-4 h-4" />
            Visit Link
          </Button>
        ) : (
          <div className="w-full grid grid-cols-2 gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={handleView}>
              <ExternalLink className="w-4 h-4" />
              View
            </Button>
            <Button className="flex items-center gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
