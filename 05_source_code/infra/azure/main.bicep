@description('Azure region for the storage-only MVP environment.')
param location string = resourceGroup().location

@description('Storage account name. Must be globally unique and lowercase.')
param storageAccountName string

@description('Blob container name for media assets.')
param storageContainerName string = 'media-assets'

@description('Blob public access level for the media container.')
@allowed([
  'Blob'
  'None'
])
param blobPublicAccess string = 'Blob'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storageAccount
  properties: {
    cors: {
      corsRules: []
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: storageContainerName
  parent: blobService
  properties: {
    publicAccess: blobPublicAccess
  }
}

output storageAccountResourceName string = storageAccount.name
output storageContainerResourceName string = blobContainer.name
output blobContainerUrl string = 'https://${storageAccount.name}.blob.${environment().suffixes.storage}/${storageContainerName}'