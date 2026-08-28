import { useEffect } from 'react';

interface StructuredDataProps {
  data: Record<string, unknown> | null;
}

const SCRIPT_ID = 'supporter-structured-data';

export function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!data) {
      script?.remove();
      return;
    }

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
    return () => {
      script?.remove();
    };
  }, [data]);

  return null;
}
