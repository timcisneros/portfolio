import React from 'react';

const ProjectImage = ({ project }) => {
    const renderImage = (image, fallbackImage) => {
        const onerror = `this.onerror=null;this.src=this.dataset.fallbackImage;`;
        return (
            image && (
                <div
                    dangerouslySetInnerHTML={{
                        __html: `<img onError="${onerror}" data-fallback-image=${fallbackImage} src="${image}" />`,
                    }}
                ></div>
            )
        );
    };

    return (
        <>
            {renderImage(
                `/project-imgs/${project.name}.png`,
                '/project-imgs/github.png'
            )}
        </>
    );
};

export default ProjectImage;
