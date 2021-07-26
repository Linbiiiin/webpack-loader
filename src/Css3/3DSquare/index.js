import React from 'react';

import styles from './index.scss';

export default () => {
    const colors = ['red', 'yellow', 'green', 'blue', 'pink', 'gray'];


    return (
        <div className={styles['container']}>
            {
                Array.isArray(colors) && colors.length > 0 &&
                colors.map((item, index) => {
                    return (
                        <div
                            key={`face-${index}`}
                            className={styles['square-face']}
                        />
                    )
                })
            }
        </div>
    )
}