type Props = { src: string; alt?: string; className?: string; watermark?: string };
export default function WatermarkedImage({ src, alt = "", className }: Props) {
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
export { WatermarkedImage };
