import { Group } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';

interface StarRatingProps {
    rating: number;
    max?: number;
    size?: number;
    color?: string;
    showValue?: boolean;
}

export default function StarRating({
    rating,
    max = 5,
    size = 16,
    color = 'yellow',
    showValue = false,
}: StarRatingProps) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < max; i++) {
        if (i < fullStars) {
            stars.push(
                <IconStarFilled
                    key={i}
                    size={size}
                    style={{ color: color === 'yellow' ? '#ffd700' : color }}
                />
            );
        } else if (i === fullStars && hasHalfStar) {
            stars.push(
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                    <IconStar size={size} style={{ color: '#ddd' }} />
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            overflow: 'hidden',
                            width: '50%',
                        }}
                    >
                        <IconStarFilled
                            size={size}
                            style={{ color: color === 'yellow' ? '#ffd700' : color }}
                        />
                    </div>
                </div>
            );
        } else {
            stars.push(<IconStar key={i} size={size} style={{ color: '#ddd' }} />);
        }
    }

    return (
        <Group gap={2}>
            {stars}
            {showValue && (
                <span style={{ marginLeft: 4, fontSize: size - 2, fontWeight: 600 }}>
                    {rating.toFixed(1)}
                </span>
            )}
        </Group>
    );
}
