import highHeelsImg from "../../assets/mocks/high-heels-black-velvet.jpg";
import { ScreenLayout } from "@/components/ui/ScreenLayout";
import { ProductImageFrame } from './ImageFrame';
import { ProductDetailFrame } from './ProductDetailsFrame';
import { ProductQuestionsFrame } from "./ProductQuestionsFrame";
import { ProductsReelFrame } from "./ProductReelFrame";

import { Button } from '@/components/ui/button';


export const ProductDetailScreen = () => {
    return (
        <ScreenLayout>
            <ProductImageFrame src={highHeelsImg} />

            <ProductDetailFrame title="High Heels Black Velvet" description='Elegant black velvet high heels, perfect for evening events and formal wear.
                    Premium comfort sole for long nights without compromise.' price={1999} />

            <div className="flex gap-3 p-4">
                <Button 
                    className="flex-1" 
                    variant="default"
                    size="lg" // Larger padding/height for mobile readability
                >
                    Comprar
                </Button>
            </div>

            <ProductQuestionsFrame />
            <ProductsReelFrame />
        </ScreenLayout>
    )
}