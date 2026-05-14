import Image, { type ImageProps } from "next/image"

type AppImageProps = Omit<ImageProps, "unoptimized">

export function AppImage({ alt, referrerPolicy = "no-referrer", ...props }: AppImageProps) {
    return <Image {...props} alt={alt} referrerPolicy={referrerPolicy} unoptimized />
}
