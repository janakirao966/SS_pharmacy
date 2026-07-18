import CleanCard from './CleanCard';
import { Star, MessageSquare } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  location: string;
  rating?: number;
}

export default function TestimonialCard({
  quote,
  author,
  role,
  location,
  rating = 5,
}: TestimonialCardProps) {
  return (
    <CleanCard as="figure" variant="default" className="testimonial-item-card-wrapper" innerClassName="testimonial-item-card">
      <div className="rating-stars-row">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} size={14} className="star-icon" fill="currentColor" />
        ))}
      </div>
      <blockquote className="testimonial-quote mt-4">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div className="testimonial-divider mt-6"></div>
      <figcaption className="testimonial-author-box">
        <div className="author-avatar-box">
          <MessageSquare size={16} />
        </div>
        <div>
          <h6>{author}</h6>
          <p>{role} &middot; {location}</p>
        </div>
      </figcaption>
    </CleanCard>
  );
}
