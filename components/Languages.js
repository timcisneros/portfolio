import React from 'react';
import { useQuery } from 'react-query';

import { fetchLanguages } from '../pages/api/project-api';

const Languages = () => {
    const { isLoading, data } = useQuery('languages', fetchLanguages);

    return (
        <>{!isLoading && Object.keys(data).map((key) => console.log(key))}</>
    );
};

export default Languages;
