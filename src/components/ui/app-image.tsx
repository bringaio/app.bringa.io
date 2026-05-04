import Image, { type ImageProps } from "next/image"

type AppImageProps = Omit<ImageProps, "unoptimized">

export function AppImage({ alt, ...props }: AppImageProps) {
    return <Image {...props} alt={alt} unoptimized />
}
