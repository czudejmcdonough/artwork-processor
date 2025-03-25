import React from "react";

export function Alert({ className, ...props }) {
  return (
    <div
      className={`relative w-full rounded-lg border p-4 ${className}`}
      role="alert"
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }) {
  return <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`} {...props} />;
}

export function AlertDescription({ className, ...props }) {
  return <div className={`text-sm opacity-90 ${className}`} {...props} />;
}