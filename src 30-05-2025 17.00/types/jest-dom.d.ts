import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveValue(value: string | number): R
      toBeDisabled(): R
      toBeRequired(): R
      toHaveTextContent(text: string): R
      toContainElement(element: HTMLElement | null): R
    }
  }
}