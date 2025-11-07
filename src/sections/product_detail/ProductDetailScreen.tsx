import highHeelsImg from "../../assets/mocks/high-heels-black-velvet.jpg";
import { ImageFrame } from './ImageFrame';
import { ProductDetailFrame } from './ProductDetailsFrame';


export const ProductDetailScreen = () => {
    return (
        <div className="flex flex-col w-full min-h-screen bg-white font-sans">

            <ImageFrame src={highHeelsImg} />

            <ProductDetailFrame title="High Heels Black Velvet" description='Elegant black velvet high heels, perfect for evening events and formal wear.
                    Premium comfort sole for long nights without compromise.' price={1999} />

            <div className="flex gap-3 p-4">
                <button className="flex-1 py-3 text-base font-semibold rounded-md border-0 cursor-pointer bg-gray-200 text-gray-800">Buy</button>
                <button className="flex-1 py-3 text-base font-semibold rounded-md border-0 cursor-pointer bg-gray-200 text-gray-800">Ask a Question</button>
            </div>
        </div>
    )
}