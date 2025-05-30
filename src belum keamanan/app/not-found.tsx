"use client";
import ErrorPage from '@/components/Error/ErrorPage';
import "../styles/index.css";
export default function NotFound() {
  return <ErrorPage errorType="404" />;
}