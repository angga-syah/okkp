import { getPostBySlug, getRelatedPosts } from '@/lib/queries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import NewsDetailClientComponent from '@/components/News/detailcomponent';

// Updated type definition for Next.js 15
type Props = {
  params: Promise<{ slug: string }>
}

// Generate dynamic metadata based on slug
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the params Promise to get the slug
  const { slug } = await params;
  
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return {
      title: 'Article Not Found',
      description: 'The content you are looking for was not found'
    };
  }

  // Extract a plain text description from content if no excerpt is provided
  let description = post.excerpt || '';
  if (!description && post.content) {
    // Simple extraction of text from the content object (first paragraph)
    try {
      const firstParagraph = post.content.content?.[0]?.content?.[0]?.text || '';
      description = firstParagraph.length > 160 
        ? `${firstParagraph.substring(0, 157)}...` 
        : firstParagraph;
    } catch (error) {
      description = post.title;
    }
  }
  
  return {
    title: `${post.title} - PT. Fortuna Sada Nioga`,
    description: description || `${post.title} - Latest news from PT. Fortuna Sada Nioga`,
    openGraph: {
      title: post.title,
      description: description || `${post.title} - Latest news from PT. Fortuna Sada Nioga`,
      type: 'article',
      publishedTime: post.published_at,
      url: `https://fortunasadanioga.com/news/${slug}`,
      images: post.featured_image ? [
        {
          url: post.featured_image,
          width: 1200,
          height: 630,
          alt: post.title
        }
      ] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: description || `${post.title} - Latest news from PT. Fortuna Sada Nioga`,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
    // Optional: Add structured data for search engines
    alternates: {
      canonical: `https://fortunasadanioga.com/news/${slug}`,
    },
    keywords: post.categories?.join(', ') || 'Fortuna Sada Nioga, visa, immigration, foreign workers',
  };
}

export default async function NewsDetailPage({ params }: Props) {
  // Await the params Promise to get the slug
  const { slug } = await params;
  
  const post = await getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }
  
  const relatedPosts = await getRelatedPosts(slug, post.categories || []);
  
  return (
    <div className="pt-[200px]">
      <NewsDetailClientComponent post={post} relatedPosts={relatedPosts} />
    </div>
  );
}