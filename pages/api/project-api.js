export const fetchProjects = async () => {
    const res = await fetch('https://api.github.com/users/timcisneros/repos');
    const data = await res.json();
    return data;
};

export const fetchLanguages = async (repo) => {
    const res = await fetch(
        'https://api.github.com/repos/timcisneros/expense-tracker/languages'
    );
    const data = await res.json();
    return data;
};

export const fetchDeployments = async (projects) => {
    let urls = [];
    projects.forEach((project) =>
        projects.deployments_url ? urls.push(project.deployments_url) : null
    );

    console.log(urls);

    // const res = await fetch(
    //     'https://api.github.com/repos/timcisneros/next-news/deployments'
    // );
    // const data = await res.json();
    // return data;
};

export const fetchProfile = async () => {
    const res = await fetch('https://api.github.com/users/timcisneros');
    const data = await res.json();
    return data;
};
