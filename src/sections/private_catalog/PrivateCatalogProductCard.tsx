import React from 'react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PrivateCatalogProductCardProps {
    id: string,
    product: string,
    thumbnail: string

}

export const ProvateCatalogProductCard: React.FC<PrivateCatalogProductCardProps> = ({
    id, product, thumbnail
}) => {
    return (
        <Card className="w-full">
            <CardContent className="flex items-center p-2 sm:p-4">
                <div className="w-10 h-20 flex-shrink-0 mr-4">
                    <img src={thumbnail} alt={id} className="w-full h-full object-cover rounded-md bg-gray-200" />
                </div>

                <h3 className="text-lg font-semibold truncate">
                    {product}
                </h3>



            </CardContent>

            <CardFooter className="flex justify-end pt-0">
                <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => {}}>
                        Editar
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => {}}>
                        Ajustes
                    </Button>
                </div>
            </CardFooter>
        </Card>
            
    );    
};