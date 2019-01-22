
export default function getPort(deploymentType) {
    return ({
        node: null,
        static: 80,
        docker: null,
        laravel: 80,
        angular: 80,
        wordpress: 80,
    })[deploymentType];
}
