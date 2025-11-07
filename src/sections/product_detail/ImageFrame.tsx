import React from "react";


type ImageFrameProps = {
    src: string;
    alt?: string;
};

export const ProductImageFrame: React.FC<ImageFrameProps> = ({ src, alt = "" }: ImageFrameProps) => {
    return <div className="w-full max-w-full overflow-hidden flex justify-center items-center bg-white">
        <img src={src} alt={alt} className="w-full h-auto object-contain block" />
    </div>
};

