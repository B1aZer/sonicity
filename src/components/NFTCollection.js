export class NFTCollection {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'nft-collection';
        this.nfts = [
            {
                id: 1,
                name: "Sonicity Land Plot #1",
                image: "/images/nft1.jpg",
                description: "A premium land plot in the Sonicity metaverse",
                attributes: {
                    district: "Central",
                    size: "Large",
                    elevation: "High",
                    resourceType: "Energy",
                    resourceLevel: "Abundant"
                }
            },
            {
                id: 2,
                name: "Sonicity Land Plot #2",
                image: "/images/nft2.jpg",
                description: "A strategic land plot in the Sonicity metaverse",
                attributes: {
                    district: "North",
                    size: "Medium",
                    elevation: "Medium",
                    resourceType: "Water",
                    resourceLevel: "Moderate"
                }
            },
            {
                id: 3,
                name: "Sonicity Land Plot #3",
                image: "/images/nft3.jpg",
                description: "A resource-rich land plot in the Sonicity metaverse",
                attributes: {
                    district: "East",
                    size: "Small",
                    elevation: "Low",
                    resourceType: "Minerals",
                    resourceLevel: "High"
                }
            },
            {
                id: 4,
                name: "Sonicity Land Plot #4",
                image: "/images/nft4.jpg",
                description: "A coastal land plot in the Sonicity metaverse",
                attributes: {
                    district: "South",
                    size: "Medium",
                    elevation: "Low",
                    resourceType: "Water",
                    resourceLevel: "Very High"
                }
            }
        ];
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="nft-grid">
                ${this.nfts.map(nft => `
                    <div class="nft-card" data-nft-id="${nft.id}">
                        <div class="nft-image">
                            <img src="${nft.image}" alt="${nft.name}" />
                        </div>
                        <div class="nft-info">
                            <h3>${nft.name}</h3>
                            <p>${nft.description}</p>
                            <div class="nft-attributes">
                                <div class="attribute">
                                    <span class="label">District:</span>
                                    <span class="value">${nft.attributes.district}</span>
                                </div>
                                <div class="attribute">
                                    <span class="label">Size:</span>
                                    <span class="value">${nft.attributes.size}</span>
                                </div>
                                <div class="attribute">
                                    <span class="label">Elevation:</span>
                                    <span class="value">${nft.attributes.elevation}</span>
                                </div>
                                <div class="attribute">
                                    <span class="label">Resource:</span>
                                    <span class="value">${nft.attributes.resourceType}</span>
                                </div>
                                <div class="attribute">
                                    <span class="label">Resource Level:</span>
                                    <span class="value">${nft.attributes.resourceLevel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 