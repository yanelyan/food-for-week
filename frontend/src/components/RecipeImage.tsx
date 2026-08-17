import { CookingPot } from 'lucide-react'
import { useState } from 'react'

interface Props {
  src: string | null
  alt: string
  className?: string
}

export function RecipeImage({ src, alt, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-sky-100 via-cyan-50 to-white text-sky-500 ${className}`}
      >
        <CookingPot size={32} strokeWidth={1.8} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
