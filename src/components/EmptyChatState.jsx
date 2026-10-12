import React from 'react';

export const EmptyChatState = () => {
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mb-2">
        OmniMind AI
      </h1>
      <p className="text-sm text-gray-500 max-w-md">
        Your intelligent AI workspace.
      </p>
    </div>
  );
};
