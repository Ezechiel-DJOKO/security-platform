#!/bin/bash
echo "Téléchargement de Nuclei..."
curl -L "https://github.com" -o nuclei_package.zip
if [ -f nuclei_package.zip ]; then
    echo "Extraction du fichier..."
    unzip -o nuclei_package.zip
    echo "Installation dans /usr/local/bin/..."
    sudo mv nuclei /usr/local/bin/
    rm nuclei_package.zip LICENSE.md README.md 2>/dev/null
    echo "Vérification de la version :"
    nuclei -version
else
    echo "Échec du téléchargement."
fi
