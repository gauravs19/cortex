import { useEffect } from 'react'
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useEstimatorStore } from './store/estimatorStore'
import Home from './pages/Home'
import Estimator from './pages/Estimator'
import Settings from './pages/Settings'

function EstimateRoute() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const est = useEstimatorStore(s => s.estimates.find(e => e.id === id))

  useEffect(() => {
    if (id) {
      if (est) {
        useEstimatorStore.setState({ activeId: id })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [id, est, navigate])

  if (!est) return null
  return <Estimator />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"             element={<Home />} />
      <Route path="/estimate/:id" element={<EstimateRoute />} />
      <Route path="/settings"     element={<Settings />} />
      <Route path="*"             element={<Navigate to="/" replace />} />
    </Routes>
  )
}
