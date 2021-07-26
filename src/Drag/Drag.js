import React from 'react';

import ComList from './ComList';
import ComContent from './ComContent';

import styles from './Drag.scss';

export default () => {

    return (
        <div className={styles['drag-container']}>
            <ComList />
            <ComContent />
        </div>
    );
}