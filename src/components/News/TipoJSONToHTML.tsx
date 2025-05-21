"use client"

import React, { memo, useMemo } from 'react';
import Image from 'next/image';

interface JSONContent {
  type?: string;
  content?: JSONContent[];
  text?: string;
  attrs?: any;
  marks?: {
    type: string;
    attrs?: any;
  }[];
}

interface TipoJSONToHTMLProps {
  content: JSONContent;
}

// Helper function to apply marks recursively
const applyMarks = (content: React.ReactNode, marks: any[], index: number): React.ReactNode => {
  if (!marks || marks.length === 0) return content;
  
  const [currentMark, ...remainingMarks] = marks;
  let result = content;
  
  // Apply current mark
  switch (currentMark.type) {
    case 'bold':
      result = <strong key={`mark-bold-${index}`}>{result}</strong>;
      break;
    case 'italic':
      result = <em key={`mark-italic-${index}`}>{result}</em>;
      break;
    case 'strike':
      result = <s key={`mark-strike-${index}`}>{result}</s>;
      break;
    case 'link':
      const href = currentMark.attrs?.href || '#';
      const target = currentMark.attrs?.target || '_blank';
      const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
      result = (
        <a 
          key={`mark-link-${index}`} 
          href={href} 
          target={target} 
          rel={rel}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {result}
        </a>
      );
      break;
    case 'underline':
      result = <u key={`mark-underline-${index}`}>{result}</u>;
      break;
    case 'code':
      result = <code key={`mark-code-${index}`} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{result}</code>;
      break;
    default:
      break;
  }
  
  // Apply remaining marks recursively
  if (remainingMarks.length > 0) {
    return applyMarks(result, remainingMarks, index);
  }
  
  return result;
};

// Memoized NodeRenderer for better performance
const NodeRenderer = memo(({ node, index }: { node: JSONContent; index: number }) => {
  if (!node) return null;

  // Text node
  if (node.text) {
    if (node.marks && node.marks.length > 0) {
      return applyMarks(node.text, node.marks, index);
    }
    return node.text;
  }

  // Handle different node types
  switch (node.type) {
    case 'doc':
      return (
        <React.Fragment key={`doc-${index}`}>
          {node.content?.map((child, i) => (
            <NodeRenderer key={`doc-child-${i}`} node={child} index={i} />
          ))}
        </React.Fragment>
      );
    
    case 'paragraph':
      return (
        <p key={`p-${index}`} className="mb-6 text-base leading-relaxed text-gray-700 dark:text-gray-300">
          {node.content?.map((child, i) => (
            <NodeRenderer key={`p-child-${i}`} node={child} index={i} />
          ))}
        </p>
      );
    
    case 'heading':
      const level = node.attrs?.level || 2;
      switch (level) {
        case 1:
          return (
            <h1 key={`h1-${index}`} className="text-3xl font-bold mt-12 mb-6 text-gray-800 dark:text-gray-200">
              {node.content?.map((child, i) => (
                <NodeRenderer key={`h1-child-${i}`} node={child} index={i} />
              ))}
            </h1>
          );
        case 2:
          return (
            <h2 key={`h2-${index}`} className="text-2xl font-bold mt-10 mb-5 text-gray-800 dark:text-gray-200">
              {node.content?.map((child, i) => (
                <NodeRenderer key={`h2-child-${i}`} node={child} index={i} />
              ))}
            </h2>
          );
        case 3:
          return (
            <h3 key={`h3-${index}`} className="text-xl font-bold mt-8 mb-4 text-gray-800 dark:text-gray-200">
              {node.content?.map((child, i) => (
                <NodeRenderer key={`h3-child-${i}`} node={child} index={i} />
              ))}
            </h3>
          );
        default:
          return (
            <h4 key={`h4-${index}`} className="text-lg font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200">
              {node.content?.map((child, i) => (
                <NodeRenderer key={`h4-child-${i}`} node={child} index={i} />
              ))}
            </h4>
          );
      }
    
    case 'bulletList':
      return (
        <ul key={`ul-${index}`} className="mb-8 ml-8 list-disc text-gray-700 dark:text-gray-300">
          {node.content?.map((child, i) => (
            <NodeRenderer key={`ul-child-${i}`} node={child} index={i} />
          ))}
        </ul>
      );
    
    case 'orderedList':
      return (
        <ol key={`ol-${index}`} className="mb-8 ml-8 list-decimal text-gray-700 dark:text-gray-300">
          {node.content?.map((child, i) => (
            <NodeRenderer key={`ol-child-${i}`} node={child} index={i} />
          ))}
        </ol>
      );
    
    case 'listItem':
      return (
        <li key={`li-${index}`} className="mb-3">
          {node.content?.map((child, i) => (
            <NodeRenderer key={`li-child-${i}`} node={child} index={i} />
          ))}
        </li>
      );
    
    case 'blockquote':
      return (
        <blockquote key={`blockquote-${index}`} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-6 italic text-gray-700 dark:text-gray-300">
          {node.content?.map((child, i) => (
            <NodeRenderer key={`blockquote-child-${i}`} node={child} index={i} />
          ))}
        </blockquote>
      );
    
    case 'horizontalRule':
      return <hr key={`hr-${index}`} className="my-8 border-t border-gray-300 dark:border-gray-600" />;
    
    case 'image':
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || 'Image';
      const title = node.attrs?.title;
      
      return (
        <figure key={`figure-${index}`} className="my-8">
          <div className="relative w-full h-auto min-h-[250px] rounded-lg overflow-hidden">
            {src && (
              // Add error handling for images
              <div className="relative w-full h-64 md:h-96">
                <Image
                  src={src}
                  alt={alt}
                  title={title}
                  className="object-contain w-full h-full"
                  onError={(e) => {
                    // On error, replace with a placeholder
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDY4LjVDMTAwIDczLjE5NzQgMTAzLjg4MyA3Ny4wODYyIDEwOC42MDkgNzcuMDg2MkMxMTMuMzM1IDc3LjA4NjIgMTE3LjIxOCA3My4xOTc0IDExNy4yMTggNjguNUM3Mi4zNDc4IDY4LjUgMzUuNSAxMDUuMzEyIDM1LjUgMTUwLjEzQzM1LjUgMTU0LjgyOCAzOS4zODI5IDE1OC43MTcgNDQuMTA5MiAxNTguNzE3SDEzLjc4MzFDOS4wNTY4IDE1OC43MTcgNS4yNjU2MiAxNTQuODI4IDUuMjY1NjIgMTUwLjEzQzUuMTczODMgMTA1LjMxMiA0Mi4wMjE1IDY4LjUgMTAwIDY4LjVaIiBmaWxsPSIjOTRBM0IyIi8+PHBhdGggZD0iTTEwMCAxMzIuOTEzQzEwMCAxMTEuNjYxIDExNy4yMTggOTQuNDU2OSAxMzguNDc4IDk0LjQ1NjlDMTU5LjczOSA5NC40NTY5IDE3Ni45NTcgMTExLjY2MSAxNzYuOTU3IDEzMi45MTNDMTc2Ljk1NyAxNTQuMTY0IDE1OS43MzkgMTcxLjM2OSAxMzguNDc4IDE3MS4zNjlDMTE3LjEyNiAxNzEuNDYgMTAwIDE1NC4xNjQgMTAwIDEzMi45MTNaIiBmaWxsPSIjOTRBM0IyIi8+PC9zdmc+';
                    console.error(`Failed to load image: ${src}`);
                  }}
                />
              </div>
            )}
          </div>
          {title && (
            <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400 italic">
              {title}
            </figcaption>
          )}
        </figure>
      );
    
    case 'hardBreak':
      return <br key={`br-${index}`} />;
    
    default:
      // For any unhandled node types, attempt to render their content
      if (node.content) {
        return (
          <React.Fragment key={`fragment-${index}`}>
            {node.content.map((child, i) => (
              <NodeRenderer key={`fragment-child-${i}`} node={child} index={i} />
            ))}
          </React.Fragment>
        );
      }
      
      // Return empty fragment for undefined nodes to prevent errors
      return <React.Fragment key={`empty-${index}`}></React.Fragment>;
  }
});

// Add display name to the NodeRenderer component
NodeRenderer.displayName = 'NodeRenderer';

// Main component with defensive coding to handle null or undefined content
const TipoJSONToHTML: React.FC<TipoJSONToHTMLProps> = ({ content }) => {
  // Safely wrap the content rendering in defensive checks
  const renderedContent = useMemo(() => {
    // Check if content exists
    if (!content) {
      console.warn("TipoJSONToHTML received null or undefined content");
      return <div className="py-4 px-6 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">No content available</div>;
    }
    
    // Check if content.content exists and is an array
    if (!content.content || !Array.isArray(content.content) || content.content.length === 0) {
      console.warn("TipoJSONToHTML received empty or malformed content");
      return <div className="py-4 px-6 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">Empty content</div>;
    }
    
    // Render content safely
    try {
      return content.content.map((node, index) => (
        <NodeRenderer key={`root-${index}`} node={node} index={index} />
      ));
    } catch (error) {
      console.error("Error rendering TipTap content:", error);
      return (
        <div className="py-4 px-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400">
          Error rendering content. Please try refreshing the page.
        </div>
      );
    }
  }, [content]);

  return (
    <div className="tiptap-content">
      {renderedContent}
    </div>
  );
};

// Add display name to the component
TipoJSONToHTML.displayName = 'TipoJSONToHTML';

// Export memoized component
export default memo(TipoJSONToHTML);