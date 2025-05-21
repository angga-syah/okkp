"use client"

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { supabaseClient } from '@/lib/sb_client';
import debounce from 'lodash/debounce';

// Define props interface
interface RichTextEditorProps {
  initialContent?: any;
  onChange: (content: any) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent = {}, onChange }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Used to handle hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debounce the onChange callback to prevent too many re-renders
  const debouncedOnChange = useMemo(
    () => debounce((content: any) => {
      onChange(content);
    }, 300),
    [onChange]
  );

  // Ensure initialContent is valid object to prevent TipTap errors
  const safeInitialContent = useMemo(() => {
    try {
      // If initialContent is undefined, null, or not an object, return empty doc
      if (!initialContent || typeof initialContent !== 'object') {
        console.warn('Invalid initialContent provided to RichTextEditor, using empty document');
        return {
          type: 'doc',
          content: [{ type: 'paragraph' }]
        };
      }
      
      // If it doesn't have required properties, return empty doc
      if (!initialContent.type) {
        console.warn('Malformed initialContent provided to RichTextEditor, using empty document');
        return {
          type: 'doc',
          content: [{ type: 'paragraph' }]
        };
      }
      
      return initialContent;
    } catch (error) {
      console.error('Error processing initialContent:', error);
      return {
        type: 'doc',
        content: [{ type: 'paragraph' }]
      };
    }
  }, [initialContent]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Mulai menulis konten berita...',
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    ],
    content: safeInitialContent,
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getJSON());
    },
    // Fix for SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none p-4 min-h-[300px] dark:prose-invert prose-img:rounded prose-img:mx-auto focus:outline-none',
      },
    },
  });

  // Use useCallback to prevent recreating function on each render
  const uploadImage = useCallback(async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Hanya format JPG, PNG, GIF, dan WEBP yang diizinkan');
        return;
      }

      // Max file size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `news_content/${fileName}`;
      
      // Show progress notification
      const progressToast = toast.loading('Mengunggah gambar...');
      
      // Upload to Supabase Storage with simulated progress
      // Note: Supabase doesn't provide upload progress, so we simulate it
      const simulateProgress = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(simulateProgress);
            return 90;
          }
          return newProgress;
        });
      }, 300);
      
      const { error } = await supabaseClient.storage
        .from('news_media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      clearInterval(simulateProgress);
      setUploadProgress(100);
      
      if (error) {
        toast.error('Gagal mengunggah gambar: ' + error.message, {
          id: progressToast
        });
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('news_media')
        .getPublicUrl(filePath);
      
      // Add image to editor
      if (editor && urlData.publicUrl) {
        editor.chain().focus().setImage({ 
          src: urlData.publicUrl,
          alt: file.name 
        }).run();
      } else {
        throw new Error('Editor or image URL not available');
      }
      
      toast.success('Gambar berhasil diunggah', {
        id: progressToast
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Gagal mengunggah gambar: ${error.message || 'Kesalahan tidak diketahui'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [editor]);

  // Handle image file selection
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadImage(e.target.files[0]);
    }
  }, [uploadImage]);

  // Set link
  const setLink = useCallback(() => {
    if (linkUrl && editor) {
      // Add http:// if missing
      let url = linkUrl;
      if (url && !/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    } else if (editor) {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [linkUrl, editor]);

  // Show loading state during SSR or before mounting
  if (!isMounted || !editor) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden p-4 min-h-[300px] bg-gray-50 dark:bg-gray-800">
        <div className="animate-pulse flex justify-center items-center h-full">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400">Loading editor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Menu Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 flex flex-wrap items-center gap-1">
        {/* Bold button */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
          </svg>
        </button>
        
        {/* Italic button */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4h-10"></path>
          </svg>
        </button>
        
        <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
        
        {/* Heading buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Heading 2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Heading 3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
          </svg>
        </button>
        
        <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
        
        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Bullet List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7"></path>
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Ordered List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
        </button>
        
        <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
        
        {/* Link button and input */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              editor.isActive('link') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          
          {showLinkInput && (
            <div className="absolute top-10 left-0 z-10 w-64 p-2 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-grow px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setLink();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={setLink}
                  className="px-2 py-1 text-sm bg-blue-500 text-white rounded-r hover:bg-blue-600"
                >
                  Set
                </button>
              </div>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkInput(false);
                  }}
                  className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800"
                >
                  Remove link
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Image upload button with progress */}
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={uploading}
            title="Insert Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/jpeg,image/png,image/gif,image/webp" 
              className="hidden" 
            />
          </button>
          
          {uploading && (
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-in-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bubble Menu */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="flex bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 ${editor.isActive('bold') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 ${editor.isActive('italic') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 ${editor.isActive('strike') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(true)}
            className={`p-2 ${editor.isActive('link') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
          >
            Link
          </button>
        </BubbleMenu>
      )}
      
      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm sm:prose lg:prose-lg max-w-none p-4 min-h-[300px] dark:prose-invert prose-img:rounded prose-img:mx-auto focus:outline-none"
      />
      
      {/* Image Upload Instructions */}
      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p>
          Tip: Anda dapat mengunggah gambar dengan klik tombol gambar atau tarik dan lepas gambar ke editor. Ukuran maksimal 5MB.
        </p>
      </div>
    </div>
  );
};

export default RichTextEditor;