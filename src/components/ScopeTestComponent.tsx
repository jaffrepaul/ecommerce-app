'use client'

import { useEffect } from 'react'

export function ScopeTestComponent() {
  useEffect(() => {
    console.log('🧪 Test 1: Immediate log after mount');
    
    // Test 2: Delayed log
    setTimeout(() => {
      console.log('🧪 Test 2: Delayed log (1 second)');
    }, 1000);
    
    // Test 3: Async context
    (async () => {
      await new Promise(r => setTimeout(r, 1500));
      console.log('🧪 Test 3: Async context log (1.5 seconds)');
    })();
    
    // Test 4: Event handler
    const handleClick = () => {
      console.log('🧪 Test 4: Event handler log (click anywhere)');
    };
    document.addEventListener('click', handleClick);
    
    // Test 5: Promise chain
    Promise.resolve()
      .then(() => new Promise(r => setTimeout(r, 2000)))
      .then(() => {
        console.log('🧪 Test 5: Promise chain log (2 seconds)');
      });
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded shadow-lg">
      <p className="text-sm font-semibold">🧪 Scope Test Active</p>
      <p className="text-xs">Check browser console for results</p>
      <p className="text-xs">Click anywhere to trigger event handler test</p>
    </div>
  );
}


