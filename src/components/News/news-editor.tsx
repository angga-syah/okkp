"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/Common/AuthGuard';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { uploadNewsImage } from '@/lib/upload';

// Define the editor content type
interface EditorContent {
  type: string;
  content?: Array<{
    type: string;
    content?: unknown[];
    attrs?: Record<string, unknown>;
    marks?: unknown[];
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// Define the NewsArticle type 
interface NewsArticle {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content: EditorContent;
  featured_image?: string;
  author?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  status: 'draft' | 'published';
  categories?: string[];
}

// Import the editor dynamically with explicit SSR setting
const RichTextEditor = dynamic(() => import('@/components/News/RichTextEditor'), {
  ssr: false, // Explicitly disable SSR
  loading: () => (
    <div className="h-64 w-full border rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
      <div className="animate-pulse">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="mt-3 text-center text-gray-600 dark:text-gray-400">Loading editor...</p>
      </div>
    </div>
  ),
});

const NewsManagementPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State variables
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [editorContent, setEditorContent] = useState<EditorContent | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Custom category input
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Handle client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Edit existing article - declare this function before it's used in fetchArticleById
  const handleEditArticle = useCallback((article: NewsArticle) => {
    setEditingArticle(article);
    setEditorContent(article.content);
    setImagePreview(article.featured_image || null);
    setCategories(article.categories || []);
    setView('edit');
    setUnsavedChanges(false);
    
    // Update URL to reflect editing state
    router.push(`/wali/news?id=${article.id}`);
  }, [router]);

  // Create new article
  const handleCreateNew = useCallback(() => {
    const emptyContent: EditorContent = {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    };
    
    setEditingArticle({
      title: '',
      content: emptyContent,
      excerpt: '',
      status: 'draft',
      categories: []
    });
    setEditorContent(emptyContent);
    setImagePreview(null);
    setCategories([]);
    setView('edit');
    setUnsavedChanges(false);
  }, []);
  
  // Memoized API fetch functions
  const fetchArticleById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/news/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      
      const data = await response.json();
      if (data.article) {
        handleEditArticle(data.article);
      } else {
        toast.error('Article not found');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [handleEditArticle]);
  
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news');
      
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Check for URL parameters on component mount
  useEffect(() => {
    if (!isClient) return;

    const action = searchParams.get('action');
    const id = searchParams.get('id');
    
    if (action === 'create') {
      // Switch to create mode
      handleCreateNew();
    } else if (id) {
      // Find the article in current state or fetch it
      const article = articles.find(a => a.id === id);
      if (article) {
        handleEditArticle(article);
      } else {
        fetchArticleById(id);
      }
    }
  }, [searchParams, isClient, articles, handleCreateNew, handleEditArticle, fetchArticleById]);
  
  // Warn about unsaved changes when trying to navigate away
  useEffect(() => {
    if (!isClient) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedChanges, isClient]);
  
  // Fetch articles on component mount
  useEffect(() => {
    if (isClient) {
      fetchArticles();
    }
  }, [fetchArticles, isClient]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editorContent) return;
    
    try {
      setSaving(true);
      
      // Prepare article data with editor content
      const articleData: NewsArticle = {
        ...editingArticle,
        content: editorContent
      };
      
      let response;
      
      if (editingArticle.id) {
        // Update existing article
        response = await fetch(`/api/news/${editingArticle.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(articleData),
        });
      } else {
        // Create new article
        response = await fetch('/api/news', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(articleData),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save article');
      }      
      toast.success(editingArticle.id ? 'Article updated successfully' : 'Article created successfully');
      
      // Reset unsaved changes flag
      setUnsavedChanges(false);
      
      // Refresh article list and return to list view
      await fetchArticles();
      setView('list');
      
      // Update URL without the action parameter
      router.push('/wali/news');
      
    } catch (error) {
      console.error('Failed to save article:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save article';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  // Enhanced image upload with progress
  const handleImageUploadWithProgress = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Preview the image immediately for better UX
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Upload the image to Supabase Storage with progress tracking
      const imageUrl = await uploadNewsImage(file, (progress) => {
        setUploadProgress(progress);
      });
      
      if (imageUrl) {
        // Update the editing article with the new image URL
        setEditingArticle(prev => prev ? { ...prev, featured_image: imageUrl } : null);
        toast.success('Image uploaded successfully');
        setUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage);
      // Keep the preview but mark that there was an error
      setImagePreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);
  
  // Handle image removal
  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    setEditingArticle(prev => prev ? { ...prev, featured_image: undefined } : null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUnsavedChanges(true);
  }, []);
  
  // Handle adding a new category
  const handleAddCategory = useCallback(() => {
    if (!newCategory.trim()) return;
    
    // Don't add duplicate categories
    if (categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    
    const newCategories = [...categories, newCategory.trim()];
    setCategories(newCategories);
    setNewCategory('');
    
    // Update the editing article with the new categories
    setEditingArticle(prev => 
      prev ? { ...prev, categories: newCategories } : null
    );
    setUnsavedChanges(true);
  }, [categories, newCategory]);
  
  // Handle removing a category
  const handleRemoveCategory = useCallback((category: string) => {
    const newCategories = categories.filter(c => c !== category);
    setCategories(newCategories);
    
    // Update the editing article with the new categories
    setEditingArticle(prev => 
      prev ? { ...prev, categories: newCategories } : null
    );
    setUnsavedChanges(true);
  }, [categories]);
  
  // Handle article deletion with confirmation
  const handleDeleteArticle = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete article');
      }
      
      // Remove from state
      setArticles(prev => prev.filter(article => article.id !== id));
      
      toast.success('Article deleted successfully');
    } catch (error) {
      console.error('Failed to delete article:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete article';
      toast.error(errorMessage);
    }
  }, []);
  
  // Handle editor content changes
  const handleEditorChange = useCallback((content: EditorContent) => {
    setEditorContent(content);
    setUnsavedChanges(true);
  }, []);
  
  // Format date for display
  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingArticle(prev => prev ? { ...prev, title: e.target.value } : null);
    setUnsavedChanges(true);
  }, []);

  // Handle excerpt change
  const handleExcerptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingArticle(prev => prev ? { ...prev, excerpt: e.target.value } : null);
    setUnsavedChanges(true);
  }, []);

  // Handle status change
  const handleStatusChange = useCallback((status: 'draft' | 'published') => {
    setEditingArticle(prev => prev ? { ...prev, status } : null);
    setUnsavedChanges(true);
  }, []);

  // Navigate back to list view with confirmation if there are unsaved changes
  const navigateBackToList = useCallback(() => {
    if (unsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    setView('list');
    router.push('/wali/news');
    setUnsavedChanges(false);
  }, [unsavedChanges, router]);

  // If client-side rendering hasn't happened yet, show a loading state
  if (!isClient) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredPermission="canManageContent">
      <div className="w-full p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {view === 'list' ? 'Manajemen Berita' : view === 'edit' && editingArticle?.id ? 'Edit Berita' : 'Tambah Berita Baru'}
          </h1>
          
          <div className="flex space-x-2">
            {/* Always show Dashboard button in both views */}
            <Link 
              href="/wali"
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </Link>
            
            {view === 'list' ? (
              // Show "Add New" button in list view
              <button
                onClick={handleCreateNew}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Tambah Berita Baru
              </button>
            ) : (
              // Show "Back to List" button in edit view
              <button
                onClick={navigateBackToList}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Kembali ke Daftar
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center my-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : view === 'list' ? (
          // Articles List View with animations
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Judul
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tanggal Dibuat
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {articles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8m-2 0v10M9 13h.01M9 17h.01M13 13h.01M13 17h.01" />
                          </svg>
                          <p>Belum ada artikel berita. Klik &quotTambah Berita Baru&quot untuk mulai.</p>
                          <button
                            onClick={handleCreateNew}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Tambah Berita Baru
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    articles.map((article, index) => (
                      <motion.tr 
                        key={article.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {article.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {article.slug}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${article.status === 'published' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}
                          >
                            {article.status === 'published' ? 'Dipublikasikan' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {article.categories && article.categories.length > 0 ? (
                              article.categories.slice(0, 3).map((category, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded">
                                  {category}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">Tidak ada kategori</span>
                            )}
                            {article.categories && article.categories.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded">
                                +{article.categories.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(article.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditArticle(article)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              Edit
                            </button>
                            {article.status === 'published' && article.slug && (
                              <Link 
                                href={`/news/${article.slug}`} 
                                target="_blank"
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                Lihat
                              </Link>
                            )}
                            <button
                              onClick={() => handleDeleteArticle(article.id!)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Hapus
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          // Article Edit/Create Form View with animations
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            {/* Unsaved changes indicator */}
            {unsavedChanges && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-4 rounded">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">Perubahan belum disimpan</p>
                </div>
              </div>
            )}
            
            {/* Title input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Judul Berita <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={editingArticle?.title || ''}
                onChange={handleTitleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            
            {/* Excerpt input */}
            <div>
              <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ringkasan
              </label>
              <textarea
                id="excerpt"
                value={editingArticle?.excerpt || ''}
                onChange={handleExcerptChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Ringkasan singkat yang akan ditampilkan di halaman daftar berita (opsional).
              </p>
            </div>
            
            {/* Featured image upload with progress bar */}
            <div>
              <label htmlFor="featured-image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gambar Utama
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <input
                  type="file"
                  id="featured-image"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUploadWithProgress}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Mengunggah...
                    </span>
                  ) : 'Pilih Gambar'}
                </button>
                {(imagePreview || editingArticle?.featured_image) && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Hapus Gambar
                  </button>
                )}
              </div>
              
              {/* Upload progress bar */}
              {uploading && (
                <div className="w-full mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              {/* Image preview */}
              <AnimatePresence>
                {(imagePreview || editingArticle?.featured_image) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3"
                  >
                    <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
                      {/* Replace img with Next.js Image component */}
                      <div className="relative w-full" style={{ maxHeight: '200px', height: '200px' }}>
                        <Image 
                          src={imagePreview || editingArticle?.featured_image || ''} 
                          alt="Preview" 
                          fill
                          sizes="100vw"
                          style={{ objectFit: 'cover' }}
                          priority
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Categories with animation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategori
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                <AnimatePresence>
                  {categories.map((category) => (
                    <motion.span 
                      key={category}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                    >
                      {category}
                      <button
                        type="button"
                        className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                        onClick={() => handleRemoveCategory(category)}
                        aria-label={`Remove ${category} category`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Tambah kategori baru"
                  className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Tambah
                </button>
              </div>
            </div>
            
            {/* Article content editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Konten Berita <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                initialContent={editingArticle?.content || {}}
                onChange={handleEditorChange}
              />
            </div>
            
            {/* Article status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Publikasi
              </label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <input
                    id="status-draft"
                    name="status"
                    type="radio"
                    checked={editingArticle?.status === 'draft'}
                    onChange={() => handleStatusChange('draft')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="status-draft" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Draft (Hanya disimpan, tidak dipublikasikan)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="status-published"
                    name="status"
                    type="radio"
                    checked={editingArticle?.status === 'published'}
                    onChange={() => handleStatusChange('published')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="status-published" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Publikasikan (Langsung terlihat di website)
                  </label>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end pt-5 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={navigateBackToList}
                className="mr-3 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !editingArticle?.title}
                className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${saving ? 'cursor-not-allowed' : ''}`}
              >
                {saving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </span>
                ) : editingArticle?.id ? 'Perbarui Berita' : 'Buat Berita'}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </AuthGuard>
  );
};

export default NewsManagementPage;