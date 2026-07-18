interface AyurvedicTermProps {
  children: React.ReactNode;
}

/**
 * WCAG-compliant inline element to tag Sanskrit/Ayurvedic medical terms.
 */
function AyurvedicTerm({ children }: AyurvedicTermProps) {
  return (
    <span lang="sa" className="ayurvedic-term">
      {children}
    </span>
  );
}

/**
 * Utility to wrap Sanskrit / Ayurvedic terms in a span with lang="sa" for WCAG compliance.
 */
export function renderAyurvedicText(text: string) {
  const terms = [
    'Sarsapa Thila', 'Hingula Shuddha', 'Triphala Churna', 'Amalaki', 
    'Haritaki', 'Vibhitaki', 'Krishna Jeeraka', 'Kuberakshi', 'Sonti', 
    'Akarakarabha', 'Jambeera Swarasa', 'Manjishta Churna', 'Chandana Churna', 
    'Kumkuma Puvvu', 'Japhal Churna', 'Ayurveda', 'Ayurvedic', 'Vata', 'Thila', 'Churna'
  ];
  
  // Sort terms by length descending to match larger terms first
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  
  let parts: (string | React.ReactElement)[] = [text];
  
  for (const term of sortedTerms) {
    const newParts: (string | React.ReactElement)[] = [];
    for (const part of parts) {
      if (typeof part !== 'string') {
        newParts.push(part);
        continue;
      }
      
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      const splits = part.split(regex);
      if (splits.length === 1) {
        newParts.push(part);
      } else {
        for (let i = 0; i < splits.length; i++) {
          if (i % 2 === 1) {
            newParts.push(
              <AyurvedicTerm key={`${term}-${i}`}>
                {splits[i]}
              </AyurvedicTerm>
            );
          } else if (splits[i] !== '') {
            newParts.push(splits[i]);
          }
        }
      }
    }
    parts = newParts;
  }
  
  return <>{parts}</>;
}
