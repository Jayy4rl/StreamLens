/**
 * Alert Component
 *
 * Reusable alert/notification component for consistent error/success messaging
 */

import React from "react";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
  type: AlertType;
  message: string;
  title?: string;
  onClose?: () => void;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Alert: React.FC<AlertProps> = ({
  type,
  message,
  title,
  onClose,
  dismissible = true,
  action,
}) => {
  const styles = {
    success: {
      bg: "bg-green-950",
      border: "border-green-900",
      text: "text-green-400",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    error: {
      bg: "bg-red-950",
      border: "border-red-900",
      text: "text-red-400",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    warning: {
      bg: "bg-yellow-950",
      border: "border-yellow-900",
      text: "text-yellow-400",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    info: {
      bg: "bg-blue-950",
      border: "border-blue-900",
      text: "text-blue-400",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const currentStyle = styles[type];

  return (
    <div
      className={`${currentStyle.bg} border ${currentStyle.border} rounded p-4 flex items-start justify-between gap-3`}
      role="alert"
    >
      <div className="flex items-start gap-3 flex-1">
        <div className={currentStyle.text}>{currentStyle.icon}</div>
        <div className="flex-1 min-w-0">
          {title && <div className="font-bold mb-1">{title}</div>}
          <div className="text-sm">{message}</div>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 text-sm ${currentStyle.text} font-bold hover:underline`}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition shrink-0"
          aria-label="Close alert"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Alert;
